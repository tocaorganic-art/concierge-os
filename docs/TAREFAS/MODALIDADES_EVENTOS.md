# Modal completo de eventos — "Próximos eventos" / Agenda

> Criado em 2026-09-29. Branch `feature/eventos-modal-completo`.

## Contexto e decisão importante

O pedido original falava em uma seção "Próximos eventos" e numa entidade `Event`.
Nenhuma das duas existe como tal neste repositório:

- **Não existe entidade `Event`** no Base44 (`base44/entities/`). O que existe é a
  entidade **`Task`**, e é ela quem alimenta tanto a Agenda interna
  (`src/pages/Agenda.jsx`) quanto o widget "Próximos eventos" do Dashboard.
- O widget `DashboardProximosEventos.jsx` (o que literalmente se chama "Próximos
  eventos") é **exclusivo do portal do cliente** — só renderiza quando
  `isClientMode` é verdadeiro — e é somente-leitura por design. A RLS de `Task`
  só permite `update` para quem criou a tarefa ou para `admin`; um cliente não
  conseguiria salvar nada por ali mesmo que o modal estivesse ligado lá.
- O lugar onde "clicar num evento não faz nada" de fato batia com o pedido era o
  **`TaskCard` da página `Agenda.jsx`** (uso interno da equipe) — ele não tinha
  nenhum `onClick` de abertura, só o toggle de status.

**Decisão:** o modal completo foi implementado sobre a entidade `Task` e ligado
ao clique nos cards da **Agenda** (só para equipe — `!isClientMode` — o cliente
continua vendo a Agenda exatamente como antes, sem o clique novo). O widget do
Dashboard do cliente não foi tocado.

## O que foi implementado

### Componentes novos (`src/components/events/`)
- `EventModal.jsx` — modal principal, reutilizável para qualquer `tipo` de Task.
- `PhotoUpload.jsx` — captura de foto (câmera no celular / seletor de arquivo no
  desktop), mesmo padrão de `ExpenseFormDialog.jsx`.
- `PhotoGallery.jsx` — galeria horizontal com legenda editável inline.
- `CommentsThread.jsx` — thread de comentários com autor e timestamp.
- `EventChecklist.jsx` — sub-tarefas com checkbox, barra de progresso e template
  por tipo (`src/lib/eventChecklistTemplates.js`).
- `EventTimeline.jsx` — histórico de mudanças (quem, quando, o quê).
- `EventStatusBadge.jsx` — badge de status próprio (pendente=cinza,
  em_progresso=amarelo, concluído=verde) — **não** reaproveita nem altera o
  `StatusBadge` compartilhado, para não mudar a cor de "pendente"/"concluído"
  em Faturamento/Propostas/etc.
- `EventPdfButton.jsx` — gera PDF do evento (título, data, observação,
  checklist, comentários, fotos), no mesmo estilo visual do
  `ProposalPdfButton.jsx`.

### Hooks novos (`src/hooks/`)
- `useEventUpdate.js` — mutation central, sempre via `base44.entities.Task.update`
  (mesma camada da criação), valida observação (mín. 5 caracteres) e grava
  `editado_em` / `editado_por_id` / `editado_por_nome` + histórico.
- `useEventComments.js` — adiciona comentário.
- `useEventPhotos.js` — upload / editar legenda / remover foto.
- `useEventHistory.js` — helpers puros para montar e formatar entradas de
  histórico.

### Schema (`base44/entities/Task.jsonc`) — tudo aditivo, nada removido
- `status`: adicionado `em_progresso` ao enum (`pendente`/`concluido` continuam
  com o mesmo significado de antes).
- Novos campos: `fotos[]`, `comentarios[]`, `checklist[]`, `responsavel_id`,
  `responsavel_nome`, `editado_em`, `editado_por_id`, `editado_por_nome`,
  `historico[]`.

### Integração
- `src/pages/Agenda.jsx`: clique no card (equipe only) abre `EventModal` com a
  task selecionada, sempre lida "ao vivo" da lista (`tasks.find(...)`) para
  refletir mudanças salvas na hora.
- `TaskReminderBanner.jsx` e `checkDeadlineAlerts/entry.ts`: passaram a
  considerar também tarefas `em_progresso` nos lembretes/alertas (antes só
  olhavam `pendente`) — para o novo status não "sumir" dos alertas existentes.

## O que ficou fora desta entrega (deliberado)

Itens do checklist original que dependiam de infraestrutura nova (não apenas
UI) e foram deixados como próximo passo, para não entregar algo meia-boca:

- **Envio automático por WhatsApp/Email com link do PDF**: o PDF é gerado e
  baixado localmente (`doc.save`); enviar por WhatsApp hoje é manual (o usuário
  anexa o PDF baixado na conversa). O componente `WhatsAppModal.jsx` já
  existente pode ser reaproveitado para gerar a mensagem de texto, mas não há
  endpoint de upload+link compartilhável ainda.
- **Relatório em lote (múltiplos eventos num PDF só)**: não implementado —
  `EventPdfButton` gera um PDF por evento.
- **Push notification / lembrete 1h antes via Slack**: o app já tem
  `TaskReminderBanner` (30 min antes, no dashboard) e `checkDeadlineAlerts`
  (e-mail diário para admins) — não foi criado um terceiro canal novo.
- **Rollback de observações**: o histórico (`historico[]`) registra o valor
  anterior de cada campo, mas não há botão de "restaurar" na UI ainda.
- **Log de tempo de permanência no modal** ("quanto tempo ficou aberto"): não
  implementado — fora do essencial pedido.
- **Sincronização com Google Calendar**: já existia antes desta tarefa
  (`calendar_event_id`, função `syncTaskToCalendar`, botão "Google Cal" no
  `TaskFormDialog`) — marcado como opcional no pedido original, não foi mexido.

## Como testar

1. Acesse `/agenda` como equipe/admin (não em "Ver como cliente").
2. Clique em qualquer card de tarefa → o `EventModal` abre com os dados atuais.
3. Mude o status (Pendente → Em progresso → Concluído) e veja o badge atualizar
   na lista da Agenda.
4. Atribua um responsável no dropdown.
5. Digite uma observação (≥ 5 caracteres) e espere ~2s — deve aparecer
   "Salvando..." e depois "Salvo" sem precisar clicar em nada.
6. Adicione uma foto (câmera no celular / arquivo no desktop) — aparece na
   galeria com campo de legenda.
7. Adicione um comentário — aparece no topo da thread com autor e horário.
8. Use "Usar checklist padrão de [tipo]" ou adicione itens manualmente; marque
   algum — a barra de progresso atualiza.
9. Clique em "Gerar PDF" — baixa um PDF com todos os dados acima.
10. Recarregue a página e reabra o mesmo evento — tudo deve persistir.

## Adicionando um novo tipo de evento

Não é preciso mexer em `EventModal` nem nos outros componentes de
`src/components/events/`. Só:
1. Adicionar o novo valor ao enum `tipo` em `base44/entities/Task.jsonc`.
2. (Opcional) Adicionar um checklist padrão para o novo tipo em
   `src/lib/eventChecklistTemplates.js`.
