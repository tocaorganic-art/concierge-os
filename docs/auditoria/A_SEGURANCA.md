# Seção A — Segurança e Controle de Acesso

Repositório: `/home/user/concierge-os` (branch `audit/auditoria-completa-2026-10`). Toda evidência foi extraída lendo os arquivos reais citados — caminho:linha + trecho citado literalmente. Nenhum arquivo de código foi alterado nesta auditoria.

## 1. RLS das entidades (base44/entities/*.jsonc)

### [CRÍTICO] A1 — Billing: cliente pode editar valor, status e natureza da própria cobrança (escalonamento financeiro)

Arquivo: `base44/entities/Billing.jsonc:276-299` (regra `update` da entidade) + campos `valor` (33-36), `status` (46-57), `natureza` (62-74), `categoria` (29-32), `data_vencimento` (127-131).

```jsonc
"update": {
  "$or": [
    { "created_by_id": "{{user.id}}" },
    { "user_condition": { "role": "admin" } },
    { "$and": [
        { "data.client_id": "{{user.data.client_id}}" },
        { "data.client_id": { "$ne": null } }
    ]}
  ]
}
```

Nenhum desses campos (`valor`, `status`, `natureza`, `categoria`, `data_vencimento`, `alocacao`) tem RLS de campo próprio para `update`. Os únicos três campos com `rls.update` (`comprovante_url` 144-162, `comprovantes` 163-202, `ultima_edicao_por` 203-227) repetem exatamente a mesma condição do nível de entidade — redundantes, não restringem nada além do que a entidade já libera.

**Impacto concreto:** uma conta `account_type=cliente` cujo `client_id` bate com o `data.client_id` do registro pode chamar `Billing.update(id, {...})` diretamente do navegador (DevTools/console) e:
- Zerar ou reduzir `valor` da própria cobrança.
- Mudar `status` para `"recebido"` sem nunca pagar (deveria ser só derivado em `src/lib/finance.js` — regra de negócio #7).
- Mudar `natureza` para `"repasse"`/`"caucao"` (o cliente nem consegue LER `alocacao`, mas pode ESCREVER nela, pois só o `read` tem RLS — `Billing.jsonc:96-103` — sem `rls.update`). Corrompe silenciosamente relatórios internos de margem/repasse.
- Alterar `data_vencimento`/`categoria` livremente.

A única trava real é que `data.client_id` enviado precisa continuar igual ao `user.data.client_id` (não rouba fatura de outro cliente), mas todos os outros campos ficam abertos.

**Recomendação mínima:** adicionar `rls.update` restrito a `created_by_id`/admin (sem o braço do cliente) nos campos `valor`, `status`, `natureza`, `categoria`, `data_vencimento`, `alocacao`, `numero_parcela`, `total_parcelas`, `moeda`, `taxa_cambio`, mantendo o braço do cliente **apenas** nos três campos de comprovante.

### [ALTO, referência positiva] Hospede: padrão correto de RLS por campo
`base44/entities/Hospede.jsonc:141-160`. `update` no nível de entidade é `created_by_id` OU admin (sem braço de cliente — linhas 155-159), e cada campo que o cliente pode preencher (`voo_chegada`, `horario_chegada`, `aerolinea_chegada`, `voo_saida`, `horario_saida`, `aerolinea_saida`, `pernoita_em`, `documento_preenchido`) tem `rls.update` explícito liberando `data.client_id`. É o padrão que falta em `Billing`.

### [MÉDIO] A8 — Billing: `create` também permite ao cliente fabricar lançamentos com qualquer natureza/status/valor
`base44/entities/Billing.jsonc:234-260`. O `create` libera `account_type=equipe` OU admin OU (`data.client_id==user.data.client_id` AND não nulo) — sem restrição de campo sobre `status`, `natureza`, `alocacao`, `valor`. Um cliente pode criar uma cobrança já com `status:"recebido"` e `valor` arbitrário atribuída a si mesmo, poluindo KPIs/relatórios.
**Recomendação:** restringir `create` a `account_type: equipe` OU admin apenas.

### [BAIXO] A13 — ServiceRequest.create sem exigir account_type
`base44/entities/ServiceRequest.jsonc:84-87`: `"create": { "created_by_id": "{{user.id}}" }` — qualquer usuário autenticado (mesmo sem `UserProfile`/vínculo) pode criar solicitações. Baixo risco (spam), mas inconsistente com o padrão das demais entidades.

### [INFORMATIVO] Simulações mentais pedidas no escopo
- **Cliente A vê/edita algo do cliente B?** Não — `read`/`update` de `Billing`, `Proposal`, `Hospede`, `Comentario`, `Task`, `Recebimento` sempre comparam `data.client_id` contra `{{user.data.client_id}}`, nunca contra valor arbitrário. Nenhum `$or` permite leitura cruzada.
- **Cliente altera cobrança ou proposta?** Cobrança → SIM (achado crítico A1). Proposta → `Proposal.jsonc:279-290`, `update` é só `created_by_id` OU admin — cliente não pode editar proposta. Correto.
- **Usuário sem perfil faz o quê?** Ver item 2 (achado mais grave desta seção).

### [CRÍTICO, requer teste em runtime] A-rt1 — `User` sem bloco `rls`
`base44/entities/User.jsonc` (38 linhas) não tem nenhuma chave `"rls"`. O comentário em `base44/functions/grantUserAccess/entry.ts:6-9` ("a entidade User não pode ser listada nem alterada pelo navegador") sugere bloqueio padrão da plataforma, mas isso **não é verificável estaticamente** a partir deste repositório.

**Requer teste em runtime:** logar como conta `cliente`/`equipe` não-admin e no console tentar `base44.entities.User.update(meuUserId, { role: "admin" })` e `{ account_type: "equipe" }`. Sucesso = escalonamento de privilégio crítico. Falha com "Permission denied" = confirma travamento padrão da plataforma.

## 2. Fluxo de convite e vinculação

### [CRÍTICO] A2 — linkInvitedAccount confia no `body.user` enviado pelo chamador, sem validar contra a sessão autenticada
Arquivo: `base44/functions/linkInvitedAccount/entry.ts:8-16`

```ts
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const newUser = body.user || {};
    if (!newUser.email || !newUser.id) {
      return Response.json({ status: 'skipped_no_email' });
    }
```

`newUser.id`/`newUser.email` vêm inteiramente do corpo da requisição HTTP — a função nunca chama `base44.auth.me()` para confirmar que o chamador é dono daquele id/email.

**Cadeia de exploração:**
1. Atacante cria conta nova no Base44 (satisfaz a trava `criadoHaMs < 24h`, linhas 46-49).
2. Chama a function com `{ user: { id: <seu user.id>, email: "cliente-vip@exemplo.com" } }` (e-mail de convite pendente descoberto por outro canal).
3. Função encontra `UserProfile` pendente por aquele `invite_email` (22-25), vincula `pending.user_id = <id do atacante>` (51), grava `account_type`/`client_id` no `User` do atacante (53-58).
4. Conta do atacante passa a ser reconhecida pelo RLS como o cliente legítimo — lê Billing, Proposal, Hospede, documentos, chat daquele cliente.

A única barreira (24h) não impede nada — o atacante cria a conta e ataca na hora.

**Recomendação mínima:** usar `const caller = await base44.auth.me();` e validar `newUser.id === caller.id && newUser.email === caller.email` — padrão já usado em `grantUserAccess/entry.ts:20-23`.

### [BOM, referência] grantUserAccess valida corretamente o chamador
`base44/functions/grantUserAccess/entry.ts:19-23` — usa `base44.auth.me()`, exige `role==='admin'`, protege contra rebaixamento de admin (39-41).

### [CRÍTICO] A3 — sendWelcomeEmail sem NENHUMA verificação de autorização — IDOR/leitura cruzada entre clientes
Arquivo: `base44/functions/sendWelcomeEmail/entry.ts:208-224`

```ts
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { client_id, preview } = body || {};
    if (!client_id) {
      return Response.json({ error: 'client_id obrigatorio' }, { status: 400 });
    }
    const client = await base44.asServiceRole.entities.Client.get(client_id);
```

Sem `base44.auth.me()`, sem checagem de papel em lugar nenhum. Qualquer conta autenticada (inclusive cliente real) pode invocar com `client_id` de **outro** cliente e `preview: true`:

```ts
if (preview) {
  return Response.json({ status: 'preview', subject, html, text, lang });
}
```

Devolve HTML/texto completo do e-mail com destino, datas de viagem daquele outro cliente (234-242) — vazamento cruzado sem papel especial. Sem `preview`, ainda **envia** e-mail de boas-vindas para `client.email` de qualquer `client_id` escolhido, gravando `welcome_email_sent_at` (252-261).

**Recomendação mínima:** `const user = await base44.auth.me(); if (!user || (user.role !== 'admin' && user?.data?.account_type !== 'equipe')) return Response.json({error:'Sem permissão'}, {status:403});` — padrão já usado em `exportBillingToSheets/entry.ts:26-33`.

### [ALTO] A6 — syncTaskToCalendar sem autenticação — grava em qualquer Task via service role e usa a agenda Google do dono
Arquivo: `base44/functions/syncTaskToCalendar/entry.ts:47-60`

```ts
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const eventType = body.event_type;
    const task = body.task;
    const entityId = body.entity_id;
    ...
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
```

Sem `base44.auth.me()`. `task`/`entity_id` vêm 100% do corpo. Com `entityId` controlado pelo chamador, linha 87 (`await base44.asServiceRole.entities.Task.update(entityId, { calendar_event_id: event.id })`) escreve em **qualquer** Task via `asServiceRole` (bypassa RLS), e as chamadas `fetch` criam/atualizam/apagam eventos na Google Agenda real do operador com conteúdo arbitrário vindo de `body.task`.

**Recomendação mínima:** exigir `auth.me()` com `role==='admin'` OU `account_type==='equipe'`, validar que `entity_id` pertence a Task que o chamador tem direito de editar (reler via `base44.entities.Task.get` sem `asServiceRole`).

### [MÉDIO] A9 — checkDeadlineAlerts e checkPaymentReminders sem autenticação — vazam dados internos
Arquivos: `base44/functions/checkDeadlineAlerts/entry.ts:36-45`, `base44/functions/checkPaymentReminders/entry.ts:14-18`. Nenhuma chama `base44.auth.me()`. `checkDeadlineAlerts` devolve a lista completa de alertas (nomes de cliente, destino, prazos — 59-85) a qualquer chamador; `notify` é `true` por padrão (linha 41), permitindo forçar disparo de e-mails internos repetidamente.

**Requer teste em runtime:** confirmar se a plataforma Base44 exige autenticação para invocar `base44/functions/*` mesmo sem checagem no código — abrir a URL pública da function sem header de autorização e ver se retorna 401 ou 200 com dados.

**Recomendação mínima, independente do teste:** adicionar checagem `role==='admin' || account_type==='equipe'` por defesa em profundidade.

### [ALTO — defesa em profundidade quebrada] A7 — ConviteNecessario importado mas nunca renderizado — gate de "acesso só por convite" é código morto
Arquivo: `src/components/layout/AppLayout.jsx:11` (import) — único outro uso é a própria definição em `src/components/auth/ConviteNecessario.jsx`. Nunca aparece no JSX de `AppLayoutInner`.

O comentário do componente (`ConviteNecessario.jsx:6-8`) descreve uma regra que **não está em vigor**: "Só quem foi convidado pela equipe entra no Toca OS." O que decide o papel é `src/lib/papel.js:17-29` (`resolverPapel`) — quando `!isAdmin && !isClient`, cai em `isTeam: true` por padrão, e `User.account_type` tem `"default": "equipe"` (`base44/entities/User.jsonc:13-20`).

Combinado com `Register.jsx:23-39` (`base44.auth.register`, autocadastro público sem token de convite) e entidades que liberam `create`/`read` a qualquer `account_type:"equipe"` (`Client.jsonc`, `Proposal.jsonc`, `Billing.jsonc`, `Partner.jsonc` leitura, `ContaPagar.jsonc`, `ContratoFornecedor.jsonc`, `Hospede.jsonc`, `Revenue.jsonc`, `ProposalTemplate.jsonc`, `BillingCategory.jsonc`):

1. Qualquer pessoa acessa `/register`, cria conta sem nunca ter recebido convite.
2. `User.account_type` fica `"equipe"` (default).
3. `ConviteNecessario` morto não bloqueia nada — entra direto no dashboard.
4. Conta "equipe" não-convidada já pode criar `Client`/`Proposal`/`Billing`/`Task`/`Expense`/`Hospede` próprios e **ler** todos os `Partner` cadastrados.

**Requer teste em runtime** (define a severidade final): em aba anônima, ir em `/register`, criar conta nunca convidada, completar OTP, verificar se `AuthContext` devolve `authError.type === 'user_not_registered'` (bloqueado pela plataforma) ou se o login é bem-sucedido e o dashboard abre (brecha crítica confirmada — religar `<ConviteNecessario/>` em `AppLayout.jsx:99-105`).

## 3. Loop de autenticação pós-login Google

Pelos comentários explícitos no próprio código, este bug **já foi diagnosticado e corrigido** nesta branch. Ver `CAUSAS_RAIZ.md` para a reconstrução completa da cadeia de execução e o risco residual identificado para contas admin.

## 4. Funções backend

### [CRÍTICO] A4 — stripeWebhook: verificação de assinatura é condicional — pode ser contornada só omitindo o header
Arquivo: `base44/functions/stripeWebhook/entry.ts:21-30`

```ts
let event;
try {
  if (webhookSecret && sig) {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } else {
    event = JSON.parse(body);
  }
} catch (err) {
  return new Response(`Webhook Error: ${err.message}`, { status: 400 });
}
```

Se `stripe-signature` não estiver presente, cai no `else` e aceita **qualquer** JSON como evento válido, sem verificação criptográfica. Um atacante pode enviar POST sem o header e um corpo forjado:

```json
{ "type": "checkout.session.completed",
  "data": { "object": { "metadata": { "user_id": "<vítima ou atacante>", "plan_id": "agency" }, "customer": "cus_fake" } } }
```

Isso roda (38-54) `UserProfile.update(profile.id, { plan_id: "agency", subscription_status: "active", stripe_customer_id: "cus_fake" })` — **ativa plano pago de graça** sem nunca pagar. Mesmo vale para `invoice.payment_succeeded` (92-113), movendo propostas para `confirmado` por `customerId` forjado.

**Recomendação mínima:**
```ts
if (!webhookSecret || !sig) return new Response("Missing signature", { status: 400 });
event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
```

### [BAIXO] A11 — stripeWebhook sem idempotência explícita
Sem checagem de `event.id` já processado. Reenvios do Stripe podem reprocessar o mesmo evento — impacto baixo hoje (operações idempotentes por natureza), mas vale registrar um controle se o volume crescer.

### [BOM] stripeCheckout, stripePortal, stripeSetup exigem autenticação
`stripeCheckout/entry.ts:10-11`, `stripePortal/entry.ts:10-11` checam `auth.me()`; `stripeSetup/entry.ts:17-20` exige `role==='admin'`. Nenhum expõe secret key na resposta.

### [MÉDIO] A12 — Inconsistência de variável de ambiente da secret key do Stripe
`stripeWebhook/entry.ts:15` usa `Deno.env.get("STRIPE_SECRET_KEY")`; `stripeCheckout/entry.ts:8`, `stripePortal/entry.ts:8`, `stripeSetup/entry.ts:15` usam `Deno.env.get("MY_STRIPE_SK")`. Se só uma estiver configurada, a outra falha silenciosamente com chave `undefined`.
**Requer teste em runtime:** confirmar no painel de secrets do Base44 se ambas existem e apontam para a mesma chave, ou padronizar.

### [BAIXO] A14 — generateWithAI: autenticado, mas sem escopo por papel nem limite de uso
`base44/functions/generateWithAI/entry.ts:9-13` exige `auth.me()` (bom), mas não distingue `account_type` — conta cliente pode chamar tipos pensados para operador (`"proposal"`, `"ai_suggestions"`). Sem vazamento de dados de terceiros, mas superfície de abuso de custo (sem rate limit).

### [BOM] exportBillingToSheets valida corretamente o papel do chamador
`base44/functions/exportBillingToSheets/entry.ts:26-33` — padrão de referência que falta em `sendWelcomeEmail`, `syncTaskToCalendar`, `checkDeadlineAlerts`, `checkPaymentReminders`.

### [BOM] Nenhuma function vaza segredos na resposta
Nenhuma devolve `Deno.env.get(...)` nem tokens de conectores nas respostas JSON. Tratamento de erro consistente, sem stack trace.

## 5. OAuthConsent.jsx / MCP / Connect.jsx

### [MÉDIO — requer teste em runtime] A10 — Redirecionamento final sem validação de origem visível no frontend
Arquivo: `src/pages/OAuthConsent.jsx:122-130`

```ts
const data = await res.json();
window.location.href = data.redirect_url;
if (!/^https?:/i.test(data.redirect_url)) {
  setDecided(action);
  setSubmitting(false);
}
```

O frontend navega para `data.redirect_url` sem validar que pertence ao `redirect_uri` registrado. Isso pode ser correto se o **servidor** validar (fora deste repo).

**Requer teste em runtime:** registrar cliente MCP de teste com `redirect_uri` legítimo, tentar forçar via proxy um `ctx` com `redirect_uri` diferente, verificar se o servidor rejeita. Se não validar, é open redirect **crítico**.

### [BOM] OAuthConsent.jsx documenta decisões de segurança corretas
Linhas 54-65 explicam por que usa `data.authenticated` (resposta do servidor) em vez do SDK, e por que `returnTo` é reconstruído só a partir do `ctx` — evita "parameter smuggling" via a página de consentimento.

### [BOM] base44/mcp/config.json minimalista
Só `{ "auth": "oauth" }`. `Connect.jsx` é página informativa, sem processar tokens.

## 6. Dependências, Service Worker, HTML

### [MÉDIO] Dependências desatualizadas/duplicadas
`package.json:55,65` — `date-fns@^3.6.0` e `moment@^2.30.1` simultâneos (moment em modo de manutenção). `react-quill@^2.0.0` depende de `quill` historicamente com XSS documentado (CVE-2021-3163) em versões antigas — **não confirmado no lockfile** nesta auditoria. Recomenda-se rodar `pnpm audit`/`npm audit`.

### [BOM] public/sw.js não cacheia conteúdo autenticado nem rotas de API
Exclui `/api/`/`/auth/` do cache; nunca grava navegações com `access_token`/`clear_access_token` na query. Estratégia "rede primeiro, cache como fallback" para chunks JS/CSS.

### [BAIXO] A15 — index.html sem Content-Security-Policy
Nenhuma tag CSP. Sugestão mínima:
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://connect.facebook.net;
connect-src 'self' https://*.facebook.com https://*.base44.app https://sheets.googleapis.com https://www.googleapis.com;
img-src 'self' data: https://media.base44.com https://base44.com https://*.facebook.com;
frame-ancestors 'none';
```

### [MÉDIO — privacidade/LGPD] A16 — Meta Pixel dispara PageView em TODAS as rotas, incluindo o dashboard autenticado
`index.html:16-29` — `fbq('track', 'PageView')` (linha 27) dispara incondicionalmente no load do documento único da SPA, incluindo `/dashboard`, `/faturamento`, `/agenda` para contas cliente/equipe já cadastradas.
**Recomendação mínima:** injetar o Pixel condicionalmente só em rotas institucionais/marketing (`/`, `/planos`, `/obrigado`, `/register`, `/login`), ou suprimir `PageView` em rotas do dashboard autenticado.

## O que está bom (com evidência real)

- `src/lib/authReturnTo.js:12-34` (`safeReturnTo`) implementação cuidadosa contra open redirect, incluindo o caso `/.//evil.com` → `//evil.com`.
- `grantUserAccess/entry.ts:19-23,39-41` valida `role==='admin'` e protege contra rebaixamento de admin.
- `exportBillingToSheets/entry.ts:26-33` e `stripeSetup/entry.ts:17-20` fazem checagem de autorização correta — padrão de referência.
- `Recebimento.jsonc:114-123` trava `update`/`delete` só para `role:"admin"` — impõe por RLS a regra de ledger imutável.
- `Hospede.jsonc:24-138` exemplo correto de RLS de campo granular, inclusive leitura de `documento` restrita a admin mesmo para quem o preencheu.
- `Expense.margem_admin`, `Proposal.contrato_dados_extraidos`/`documentos_admin`/`alertas_contratuais`/`versoes_anteriores`, `Recebimento.conta_destino` corretamente isolados por `rls.read: {role:"admin"}`.
- `ContratoFornecedor.jsonc`, `ContaPagar.jsonc`, `Partner.jsonc` nunca liberam leitura para conta cliente.
- `public/sw.js` exclui `/api/`, `/auth/` e navegações com token do cache, com comentários explicando o incidente real que a lógica corrige.
- `src/pages/OAuthConsent.jsx:54-65` previne corretamente "parameter smuggling" via `returnTo`.
