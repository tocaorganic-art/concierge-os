# 📌 Checkpoint: "Antes da Fase 1 — fundação e segurança"

**Data:** 2026-07-26
**App ID:** 6a1f06cb2529a2c8784acc2c
**App:** Concierge OS (Toca Concierge)

---

## Estado atual do projeto

### Visão geral
Sistema operacional de luxo para concierges independentes gerenciarem pipeline de viagens, clientes e finanças. App PWA com dark mode dourado, autenticação via Google OAuth e email/senha, integração Stripe para assinaturas.

### Entidades (11)
- **Task** — tarefas/agenda (com lembretes)
- **Client** — clientes
- **Proposal** — propostas no pipeline (lead → proposta → confirmado → concluído)
- **Billing** — cobranças
- **Partner** — parceiros (restaurantes, passeios, etc.)
- **ClientMemory** — perfil de preferências do cliente
- **Revenue** — receita mensal
- **UserProfile** — perfil do usuário (plano, trial, Stripe)
- **ServiceRequest** — solicitações de clientes
- **WaitlistEntry** — lista de espera
- **User** (built-in) — usuários do sistema

### Backend functions (5)
- `generateWithAI` — chamadas LLM
- `stripeCheckout` — checkout Stripe
- `stripePortal` — portal do cliente Stripe
- `stripeSetup` — setup Stripe
- `stripeWebhook` — webhook Stripe

### Páginas (17 rotas)
- Auth: Login, Register, ForgotPassword, ResetPassword
- Protegidas: Dashboard, Pipeline, Clients, Agenda, Proposals, Reports, Billing, Plans, Settings, TocaTrIA, Solicitacoes, ClientPortal, Parceiros, ConciergeKPIs, ClientProfile
- Públicas: Obrigado (thank you page)

### Secrets configurados
- STRIPE_WEBHOOK_SECRET
- ANTHROPIC_API_KEY
- MY_STRIPE_SK
- STRIPE_SECRET_KEY

### Connectors autorizados
- Jira (read:jira-work, write:jira-work)
- Slack (workspace connector: "Marketing Slak")

---

## Comandos executados neste checkpoint
1. `npm run build` (vite build)
2. `npm run lint` (eslint . --quiet)
3. `npm run typecheck` (tsc -p ./jsconfig.json)

---

## Notas
Este checkpoint marca o estado do projeto ANTES de qualquer alteração da Fase 1 (fundação e segurança). Nenhum código foi modificado neste momento — apenas auditoria e diagnóstico.