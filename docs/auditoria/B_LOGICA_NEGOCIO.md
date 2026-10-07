# Seção B — Corretude da Lógica de Negócio e Dados

Repositório: `/home/user/concierge-os` (branch `audit/auditoria-completa-2026-10`). Auditoria somente leitura — nada foi alterado.

## [CRÍTICO] B1 — Billing.status pode ser setado manualmente para "recebido"/"atrasado", contrariando a regra de derivação e falsificando receita

**Arquivo:** `src/components/billing/BillingFormDialog.jsx:606-617` (select) e `319-323` (persistência)

```js
// linha 608-616
<Label ...>{t("field_status")}</Label>
<Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
  ...
    <SelectItem value="pendente">{t("status_pendente")}</SelectItem>
    <SelectItem value="recebido">{t("status_recebido")}</SelectItem>
    <SelectItem value="atrasado">{t("status_atrasado")}</SelectItem>
    {billing && <SelectItem value="cancelado">{t("status_cancelado")}</SelectItem>}

// linha 319-323
mutation.mutate({
  ...form,
  valor: form.valor ? Number(form.valor) : 0,
  ...(comprovantesPayload ? { comprovantes: comprovantesPayload } : {}),
});
```

A regra (`base44/entities/Billing.jsonc:56`: *"Status derivado do saldo (ver src/lib/finance.js) — nao editar manualmente exceto 'cancelado'"*, e `src/lib/finance.js:62-65`) diz que **só "cancelado" é editável manualmente**. O formulário oferece `pendente`/`recebido`/`atrasado` livremente editáveis, gravados direto via spread `...form`, sem passar pelo ledger de `Recebimento`.

**Impacto concreto:**
1. Admin pode marcar cobrança como "recebido" sem nenhum `Recebimento` lançado. Ativa o **fallback legado** de `valorRecebido()` (`finance.js:36-39`): `if (!temLancamentoNoLedger && billing.status === "recebido") return roundCents(billing.valor)`. Esse fallback foi desenhado só para registros *anteriores* ao ledger — mas o formulário permite setar "recebido" em cobrança nova, fabricando receita que entra nos KPIs de caixa sem comprovante nem rastro real.
2. Quebra a premissa do ledger imutável (regra R3).
3. Risco composto: `scripts/backfill-recebimentos-legado.mjs:22,29-42` varre exatamente `status === "recebido"` sem lançamento no ledger e **cria um `Recebimento` permanente** (`metodo: "outro"`). Se rodado de novo, um "recebido" fabricado manualmente vira registro de ledger imutável definitivo, sem comprovante.

**Correção mínima:** remover `pendente`/`recebido`/`atrasado` do `<Select>` (deixar sempre derivado); só expor `cancelado` + `motivo_cancelamento`; nunca enviar `status` fora de `cancelado` no payload do `mutation.mutate`.

---

## [CRÍTICO] B2 — Agente de IA `assistente_propostas` tem permissão de `update` irrestrita sobre toda a entidade Proposal

**Arquivo:** `base44/agents/assistente_propostas.jsonc:4-11`

```jsonc
"tool_configs": [
  { "entity_name": "Proposal", "allowed_operations": ["read", "update"] },
  ...
],
```

Instrução (linha 3): *"Quando o cliente aprovar, confirme todos os detalhes e **atualize o status da proposta para 'confirmado'**"*.

Esse agente conversa diretamente com o cliente e tem `update` sobre **toda** a entidade — sem restrição por campo no `tool_configs`. Pode tecnicamente escrever em:
- `contrato_dados_extraidos` — schema diz (`Proposal.jsonc:90`): *"Preenchido so apos confirmacao explicita do admin [...]; nunca escrito sozinho"*.
- `alertas_contratuais` e `versoes_anteriores` — "uso exclusivo admin, entrada manual" (191, 219).
- `etapa_jornada` — Jornada da viagem, 100% manual do admin.

`rls.read` desses campos restringe leitura a admin, mas não há `rls.update` por campo, e o `tool_configs` do agente não limita por campo. Nada impede o agente sobrescrever esses campos numa conversa com o cliente, contornando o fluxo de confirmação humana do `LeituraContratoModal.jsx` (clique explícito em "Confirmar e aplicar", linha 429-432).

Além disso, setar `status: "confirmado"` com base só na aprovação verbal do cliente no chat, sem revisão humana, é transição crítica (afeta faturamento/KPIs/cobranças) decidida unilateralmente por IA conversacional.

**Correção mínima:** restringir `assistente_propostas` a subconjunto de campos permitidos (se o Base44 suportar filtros de campo), ou trocar `update` por `read`-only + função de backend intermediária que valide/filtre campos; revisar instrução para que a mudança de status para `confirmado` gere *sugestão* ao admin, não escrita direta.

---

## [ALTO] B3 — checkPaymentReminders e checkDeadlineAlerts leem status literal, não o derivado do ledger

**Arquivos:**
- `base44/functions/checkPaymentReminders/entry.ts:18` — `const pendentes = await base44.asServiceRole.entities.Billing.filter({ status: 'pendente' });`
- `src/lib/finance.js:66-84` (`statusDerivado`) nunca é chamado a partir de função de backend/workflow — só client-side.
- Nenhum arquivo contém `Billing.update(..., { status: ... })` fora de `BillingFormDialog.jsx` (confirmado por grep).

`Billing.status` no banco só muda quando: criado `"pendente"` por padrão, admin edita via `BillingFormDialog` (achado B1), ou é marcado `"cancelado"`. **Nunca** é atualizado para `"recebido"`/`"atrasado"` automaticamente quando `Recebimento` é lançado. Consequência: cobrança **totalmente paga** continua com `status === "pendente"` e **continua recebendo alerta de pagamento pendente** por e-mail até o vencimento.

**Requer teste em runtime:** criar `Billing` com `status:"pendente"`, `data_vencimento` em 1 dia, lançar `Recebimento` cobrindo 100%, rodar `checkPaymentReminders` — esperado: nenhum e-mail; achado real: e-mail enviado mesmo assim.

**Correção mínima:** em `checkPaymentReminders/entry.ts`, buscar também os `Recebimento` relacionados e calcular saldo real antes de alertar.

---

## [MÉDIO] B4 — BillingFormDialog duplica a fórmula de divisão de parcelas em vez de reusar dividirEmParcelas()

**Arquivo:** `src/components/billing/BillingFormDialog.jsx:172-186`

```js
const n = Math.max(2, Math.round(numeroParcelas) || 2);
const total = data.valor;
const base = Math.floor((total / n) * 100) / 100;
const ultima = Math.round((total - base * (n - 1)) * 100) / 100;
```

Idêntica a `src/lib/finance.js:135-140` (`dividirEmParcelas`), mas reimplementada inline — o import do arquivo (linha 26) já traz outras funções de `@/lib/finance` mas não essa. Viola a regra documentada em `finance.js:1-3` ("regra R8: nenhuma fórmula duplicada nas telas"). Resultado idêntico hoje, mas ponto de divergência futura.

**Correção mínima:** `const parcelas = dividirEmParcelas(data.valor, numeroParcelas);`

---

## [MÉDIO] B5 — Parcelas extraídas por IA no LeituraContratoModal não validadas contra valor_total/proposal.valor

**Arquivo:** `src/components/proposals/LeituraContratoModal.jsx:227-250` (bloco `criarCobrancas`), `287-288`

```js
const parcelasComData = (dados?.parcelas || []).filter((p) => p.valor > 0 && p.data_vencimento);
const parcelasDivididas = splitParcelasRepasseMargem(parcelasComData, custoPendente);
...
if (criarCobrancas && parcelasDivididas.length > 0) {
  const novas = parcelasDivididas.map((p, i) => ({ ... numero_parcela: i + 1, total_parcelas: parcelasDivididas.length, valor: p.valor, ... }));
```

Diferente do fluxo manual (`dividirEmParcelas` sempre soma exatamente o `valor` digitado), aqui as parcelas vêm de extração de IA sem **nenhuma verificação de que Σ parcelas.valor === dados.valor_total**. Erro de OCR/extração (ex.: `R$ 27.500` lido como `R$ 2.750`) cria cobranças cuja soma não bate com o valor total, sem alertar o admin na tela de revisão.

**Correção mínima:** antes do botão "Confirmar e aplicar", calcular e exibir Σ parcelasComData.valor ao lado de dados.valor_total, destacando divergência (sem bloquear).

---

## [MÉDIO] B6 — Client.nome não tem cascata para os campos denormalizados (client_nome)

**Arquivos:** `src/components/clients/ClientFormDialog.jsx:48,72` — `Client.update(client.id, data)` grava `nome` sem tocar em outra entidade. Confirmado por grep: nenhuma chamada atualiza `Billing.client_nome`/`Proposal.client_nome`/`Task.client_nome` a partir de edição de `Client`.

**Impacto:** depois de renomear um cliente, toda cobrança/proposta/tarefa já existente continua com o nome antigo nas telas (Faturamento, Pipeline, Agenda usam o campo cacheado, não join em tempo real) — inclusive para o próprio cliente em "Meu Contrato"/"Faturamento".

**Correção mínima:** disparar atualização em lote de `client_nome` nas entidades relacionadas, ou documentar o comportamento como "cache aceito".

---

## [MÉDIO] B7 — syncTaskToCalendar não remove o evento do Google Agenda quando a data da tarefa é apagada

**Arquivo:** `base44/functions/syncTaskToCalendar/entry.ts:74-77`

```ts
const eventBody = buildEvent(task);
if (!eventBody) {
  return Response.json({ status: 'skipped_no_date' });
}
```

`buildEvent()` retorna `null` quando `task.data` está vazio (linha 36), para **qualquer** `event_type`, inclusive `update`. Se uma tarefa com `calendar_event_id` existente tem sua data apagada, a função retorna `skipped_no_date` sem nunca chamar `DELETE` (o bloco de exclusão, 63-72, só roda em `event_type === 'delete'`). Evento fantasma permanece no Google Agenda.

**Requer teste em runtime:** criar Task com data (gera evento), editar apagando a data, verificar que o evento antigo continua no Google Calendar.

**Correção mínima:** antes do early-return, checar `task.calendar_event_id` e, se existir, fazer `DELETE` antes de retornar `skipped_no_date`.

---

## [BAIXO] B8 — Campos de câmbio existem no schema mas sem nenhuma UI que os grave

**Arquivos:** `base44/entities/Billing.jsonc:104-126`, `Recebimento.jsonc:33-51` declaram `valor_original`/`taxa_cambio`/`data_cambio`/`moeda`; busca em `BillingFormDialog.jsx`/`RegistrarRecebimentoDialog.jsx` não encontra referência (grep vazio). Funcionalidade "fantasma" — schema modela multi-moeda, nenhuma tela permite usá-la.

**Correção mínima:** nenhuma ação urgente; documentar como "não implementado na UI" ou remover do schema.

---

## [BAIXO / observação] B9 — Pipeline Kanban permite qualquer transição de status por drag-and-drop, sem validação de sequência

**Arquivo:** `src/pages/Pipeline.jsx:12-17` (`stages` só tem `lead/proposta/confirmado/concluido`), `98-106` (`onDragEnd` aceita qualquer transição sem checar status atual).

Kanban permite mover proposta de `concluido` de volta para `lead` sem aviso; propostas `cancelado` desaparecem (sem coluna). `status` dirige KPI de conversão — reversão acidental distorce números sem log de auditoria.

**Correção mínima:** opcional — confirmação ao mover de volta uma etapa, ou registrar a transição em `Proposal.versoes_anteriores`/log equivalente.

---

## Verificações sem achados (conferidas e corretas)

- **Ledger de Recebimento/estorno:** `RegistrarRecebimentoDialog.jsx`/`EstornarRecebimentoDialog` nunca chamam `update`/`delete` — todo estorno é `create` com `valor` negativo, `estorno_de_id` e `motivo_estorno` obrigatório. Confere com R3.
- **Bloqueio de sobrepagamento (R7):** `validarNovoRecebimento` (`finance.js:89-97`) bloqueia valor > saldo devedor com tolerância de 0,009 e data futura. Usado antes de cada mutação.
- **`etapa_jornada`:** só lido/escrito via `<Select>` manual em `ProposalFormDialog.jsx:280` e `DashboardStatusViagem.jsx:41,58`; nenhuma lógica de datas/pagamento deriva.
- **`data_validade`/expiração:** `isProposalExpired` (`proposalUtils.js:1-9`) só considera expirada proposta em `lead`/`proposta`, nunca `confirmado/concluido/cancelado`.
- **Leitura de contrato por IA:** `LeituraContratoModal.jsx` não grava nada até clique explícito em "Confirmar e aplicar" (`aplicarMutation.mutate()`); preview é só estado local antes da confirmação.
- **Alertas de prazo/pagamento — blindagem admin-only:** `checkDeadlineAlerts/entry.ts:92-99` e `checkPaymentReminders/entry.ts:27-35` filtram `role:'admin'` e `account_type !== 'cliente'` explicitamente. Timezone `America/Bahia` aplicado corretamente em ambos.
- **Chat flutuante/mensagem_rascunho:** `ChatGeral.jsx` só envia via clique explícito; `Agenda.jsx:95-104` só copia `mensagem_rascunho` para clipboard, nunca envia. RLS read restrito a admin.
- **RLS de `Task.visivel_cliente`:** exige `data.client_id` do próprio usuário **e** `visivel_cliente:true` simultaneamente. Nenhuma tela admin expõe toggle para isso — único código que seta `true` é `LeituraContratoModal.jsx:192,204` (check-in/check-out), intencional.
- **Sync Google Agenda — anti-loop:** workflow ignora corretamente updates que só alteraram `calendar_event_id`, evitando disparo recursivo.
- **`splitRepasseMargem`/`splitParcelasRepasseMargem`:** `repasse + intermediacao === valor` sempre, por construção.
- **`dividirEmParcelas`:** distribui diferença de centavos na última parcela, evitando erro de arredondamento acumulado.
- **Taxa de conversão (KPI):** `taxaConversao` retorna `null` (não 100%) quando não há propostas enviadas.
- **Agentes `assistente_roteiros` e `agente_preferencias`:** permissões mínimas e coerentes — sem risco financeiro/jornada.
