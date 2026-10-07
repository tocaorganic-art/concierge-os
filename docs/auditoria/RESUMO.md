# RESUMO DA AUDITORIA — Toca OS (Concierge OS)

Auditoria completa do repositório (site institucional + dashboard Toca OS), executada em 2026-10 na branch `audit/auditoria-completa-2026-10`, a partir de `PROMPT_AUDITORIA.md`. Natureza: somente leitura — nenhum arquivo de código foi alterado; apenas estes relatórios foram adicionados.

Cobertura: Seção A (Segurança), B (Lógica de negócio), C (Frontend/UX/Mobile), D (i18n), E (Performance/Qualidade), F (SEO/Legal). Veja os arquivos individuais em `docs/auditoria/` para evidência completa (arquivo:linha) de cada item.

## Tabela de achados (ordenada por severidade)

| ID | Severidade | Área | Título | Arquivo(s) | Recomendação (1 linha) |
|---|---|---|---|---|---|
| F4 | Crítico | Legal/LGPD | Nenhuma política de privacidade, termos de uso ou consentimento no cadastro | `src/pages/Register.jsx`, `public/institucional/index.html` | Criar páginas de privacidade/termos, linkar no rodapé e no cadastro, checkbox de aceite obrigatório |
| A1 | Crítico | Segurança/RLS | Cliente pode editar `valor`, `status`, `natureza`, `alocacao` da própria cobrança | `base44/entities/Billing.jsonc:276-299` | Adicionar `rls.update` restrito a admin/criador nesses campos, igual ao padrão já usado em `Hospede.jsonc` |
| A2 | Crítico | Segurança/Convite | `linkInvitedAccount` confia no `body.user` enviado pelo chamador, sem checar a sessão | `base44/functions/linkInvitedAccount/entry.ts:8-16` | Usar `base44.auth.me()` para obter id/email do chamador, nunca do corpo da requisição |
| A3 | Crítico | Segurança/IDOR | `sendWelcomeEmail` sem nenhuma verificação de autorização — vaza dados de outro cliente e envia e-mail arbitrário | `base44/functions/sendWelcomeEmail/entry.ts:208-224` | Exigir `auth.me()` com `role===admin \|\| account_type===equipe` no topo da função |
| A4 | Crítico | Segurança/Pagamentos | `stripeWebhook` aceita evento sem verificação de assinatura quando o header está ausente | `base44/functions/stripeWebhook/entry.ts:21-30` | Remover o `else`; rejeitar com 400/401 se `webhookSecret`/`sig` ausentes |
| B1 | Crítico | Lógica financeira | `Billing.status` pode ser setado manualmente para "recebido"/"atrasado" via formulário, contrariando a regra de derivação | `src/components/billing/BillingFormDialog.jsx:319-323,606-617` | Remover opções `pendente/recebido/atrasado` do `<Select>`; só `cancelado` editável |
| B2 | Crítico | Segurança/Agentes IA | Agente `assistente_propostas` tem `update` irrestrito sobre `Proposal`, incluindo campos exclusivos de admin | `base44/agents/assistente_propostas.jsonc:4-11` | Restringir campos permitidos ao agente ou intermediar com função de backend que valide campos |
| C1 | Crítico | Mobile | `ClientProfileSheet` com `w-[420px]` fixo sem limite responsivo — overflow garantido em qualquer celular | `src/components/clients/ClientProfileSheet.jsx:73` | Trocar para `w-full max-w-[420px] sm:w-[420px]` |
| E1 | Crítico | Build/CI | `npm run lint` chama `pnpm` — quebra em ambiente sem pnpm global; 2 lockfiles divergentes no repo | `package.json:9` | Trocar para `npm run i18n:check`; escolher um único gerenciador de pacotes |
| E2 | Crítico | Build/Deploy | Build roda sem `VITE_BASE44_APP_ID` — app publicado com todas as chamadas de API quebradas (forte candidato à causa do "site não sobe") | `base44/config.jsonc:3-7`, `vite.config.js` | Mudar `buildCommand` para `base44 build` ou garantir env vars antes de `npm run build`; criar `.env.example` |
| E6 | Crítico | Performance | Bundle de 1,8MB em chunk único, zero code-splitting de rotas | `src/App.jsx:12-38` | Envolver rotas (especialmente Reports/KPIs/Billing) com `React.lazy()` + `Suspense` |
| E9 | Crítico | Performance/SEO | Home "/" carrega o bundle inteiro do dashboard só para redirecionar via JS para a página institucional | `src/pages/Institucional.jsx:7-11` | Servir `/institucional/index.html` como home a nível de servidor, eliminar o redirect React |
| A-rt1 | Crítico (requer teste) | Segurança | `User` sem bloco `rls` — possível escalonamento de privilégio se a plataforma não travar por padrão | `base44/entities/User.jsonc` | Testar em runtime: tentar `User.update(id,{role:'admin'})` como conta cliente |
| A6 | Alto | Segurança/Backend | `syncTaskToCalendar` sem autenticação, grava em qualquer `Task` via service role | `base44/functions/syncTaskToCalendar/entry.ts:47-60` | Exigir `auth.me()` com papel adequado; reler Task sem `asServiceRole` |
| A7 | Alto | Segurança/Convite | `ConviteNecessario` é código morto — conta nova sem convite vira "equipe" por padrão | `src/components/layout/AppLayout.jsx:11`, `base44/entities/User.jsonc:13-20` | Religar `<ConviteNecessario/>` em `AppLayoutInner`; testar se a plataforma já bloqueia |
| B3 | Alto | Lógica financeira | Alertas de pagamento leem `Billing.status` literal, não o saldo real do ledger — cobrança paga continua gerando alerta | `base44/functions/checkPaymentReminders/entry.ts:18` | Calcular saldo via `Recebimento` antes de alertar |
| C2 | Alto | Mobile | `MobileTopbar` não reconhece rotas do cliente — perde acesso ao menu em Financeiro/Pedidos | `src/components/layout/MobileTopbar.jsx:5` | Tornar `PRIMARY_ROUTES` dinâmico por papel |
| C3 | Alto | Mobile | Botão de chat flutuante sobrepõe o FAB "Nova Proposta" no Pipeline | `src/components/chat/FloatingChat.jsx:60`, `src/pages/Pipeline.jsx:250-256` | Reposicionar um dos dois FABs |
| C4 | Alto | Mobile/Institucional | Grids da landing (`pillars-grid`, `services-grid`) sem breakpoint mobile — conteúdo cortado | `public/institucional/index.html:586-591,723-728` | Adicionar media queries reduzindo colunas em ≤768px |
| C5 | Alto | Frontend (bug conhecido) | Onboarding/Tutorial em tela cheia cobre `ProposalFormDialog` aberto via deep link | `src/pages/Proposals.jsx:57-65`, `src/components/onboarding/OnboardingWizard.jsx:47` | Adiar abertura do diálogo até onboarding/tutorial resolverem, ou vice-versa |
| C6 | Alto | Frontend | Item "Portal Cliente" na Sidebar aponta para rota que não ativa visão de cliente | `src/components/layout/Sidebar.jsx:236-247` | Apontar para o fluxo real de impersonation ou remover o item |
| D4 | Alto | i18n | 65 strings em PT hardcoded mesmo em páginas "migradas" — escondidas pelo `--quiet` do lint oficial | `eslint.config.js:62-92`, `src/components/billing/BillingFormDialog.jsx:543,552` | Substituir por chaves `t(...)`; rodar lint sem `--quiet` periodicamente |
| E3 | Alto | Build | `vite.config.js` com `logLevel:'error'` mascara avisos de chunk grande | `vite.config.js:7` | Remover ou trocar para `'warn'` |
| E7 | Alto | Performance | 5 dependências pesadas instaladas sem nenhum uso (`lodash`, `moment`, `three`, `react-leaflet`, `react-quill`) | `package.json:63,65,74,76,83` | Remover do `package.json` |
| E8 | Alto | Performance | Página institucional com 1,9MB por 14 imagens em base64 inline | `public/institucional/index.html` | Extrair para arquivos `.jpg`/`.webp` como já feito com as demais imagens |
| F1 | Alto | SEO | Sem `robots.txt`, `sitemap.xml`, favicon próprio, nem `hreflang` | `public/`, `public/institucional/` | Adicionar os 4 itens |
| F2 | Alto | SEO | Canonical do institucional não corresponde à URL real de conteúdo | `public/institucional/index.html:20` | Ajustar canonical ou eliminar o redirect client-side (ver E9) |
| F3 | Alto | Marketing/LGPD | Evento `Purchase` do Meta Pixel sem parâmetros; institucional sem pixel nenhum | `src/pages/Obrigado.jsx:9-14` | Incluir `value`/`currency`/`content_name`; decidir se pixel deve rastrear a landing |
| F5 | Alto | LGPD | Comprovantes de voo e documentos pessoais sobem para storage público, não privado | `src/pages/MeuGrupo.jsx:67`, `src/components/expenses/ExpenseFormDialog.jsx:153` | Trocar `Core.UploadFile` por `Core.UploadPrivateFile` + URL assinada, como já feito em `ChatAnexo.jsx` |
| D1 | Alto | i18n/Conteúdo | Dicionário i18n institucional ainda fala de "Trancoso" em vez de "Brasil" nas 3 línguas | `public/institucional/index.html:3292-3294,3595-3597,3898-3900` | Atualizar `hero.eyebrow`/`hero.lede` nas 3 línguas |
| A8 | Médio | Segurança/RLS | `Billing.create` permite cliente fabricar lançamentos com `status`/`valor` arbitrários | `base44/entities/Billing.jsonc:234-260` | Restringir `create` a `account_type:equipe` ou admin |
| A9 | Médio | Segurança/Backend | `checkDeadlineAlerts`/`checkPaymentReminders` sem `auth.me()` — vazam dados internos se alcançáveis anonimamente | `base44/functions/checkDeadlineAlerts/entry.ts:36-45` | Adicionar checagem de papel por defesa em profundidade |
| A10 | Médio (requer teste) | Segurança/OAuth | Redirecionamento final do consentimento OAuth sem validação visível de origem no frontend | `src/pages/OAuthConsent.jsx:122-130` | Testar se o servidor valida `redirect_uri`; se não, é crítico |
| A12 | Médio | Segurança/Config | Variável de ambiente da chave Stripe inconsistente entre funções (`STRIPE_SECRET_KEY` vs `MY_STRIPE_SK`) | `stripeWebhook/entry.ts:15` vs outras | Padronizar uma única variável |
| A16 | Médio | Privacidade | Meta Pixel dispara `PageView` em todas as rotas, incluindo dashboard autenticado | `index.html:16-29` | Carregar o pixel só nas rotas públicas/marketing |
| B4 | Médio | Qualidade/Financeiro | `BillingFormDialog` duplica a fórmula de divisão de parcelas em vez de reusar `dividirEmParcelas()` | `src/components/billing/BillingFormDialog.jsx:172-186` | Importar e usar a função de `finance.js` |
| B5 | Médio | Lógica/IA | Parcelas extraídas por IA no `LeituraContratoModal` não validadas contra o valor total do contrato | `src/components/proposals/LeituraContratoModal.jsx:227-250` | Exibir soma das parcelas vs valor total, alertar divergência |
| B6 | Médio | Integridade de dados | `Client.nome` sem cascata para `client_nome` denormalizado em Billing/Proposal/Task | `src/components/clients/ClientFormDialog.jsx:48` | Disparar atualização em lote ou documentar como cache intencional |
| B7 | Médio | Integração | `syncTaskToCalendar` não remove evento do Google Agenda quando a data da tarefa é apagada | `base44/functions/syncTaskToCalendar/entry.ts:74-77` | Checar `calendar_event_id` e deletar antes do early-return |
| C7 | Médio | Mobile/Design system | Regra global `min-height/width:44px` conflita com variantes `sm`/`icon` do Button | `src/index.css:147-152` | Isolar em classe utilitária `.tap-target` em vez de seletor global |
| C8 | Médio | UX | Flag de tutorial do operador só no `localStorage` (reaparece em outro dispositivo); `ClientTour` já persiste no backend | `src/components/layout/AppLayout.jsx:83,172` | Persistir no perfil do usuário, como já feito para `ClientTour` |
| C9 | Médio | Arquitetura/Segurança | Dashboard faz `.list()` sem filtro em 5 entidades para conta cliente, dependendo 100% do RLS backend | `src/pages/Dashboard.jsx:227-250` | Adicionar `enabled: !isClientMode` nessas queries |
| C10 | Médio | UX | Páginas principais sem tratamento de `isError` nas queries | `src/pages/Dashboard.jsx`, `Billing.jsx`, `Solicitacoes.jsx` | Adicionar banner de erro nas queries-chave |
| C11 | Médio | Acessibilidade | `prefers-reduced-motion` não é global; `TutorialModal`/`OnboardingWizard` sem tratamento | `src/index.css`, `TutorialModal.jsx` | Adicionar regra `@media (prefers-reduced-motion: reduce)` global |
| D3 | Médio | i18n/SEO | `<title>`/meta description nunca atualizados ao trocar idioma no institucional | `public/institucional/index.html:3921-3932` | Atualizar `document.title` e meta description em `setLang()` |
| D5 | Médio | Qualidade | Workaround não resolvido de bug do i18next em produção (3 tentativas documentadas) | `src/lib/i18n.jsx:120-149` | Investigar causa raiz antes que o paliativo falhe em cenário não coberto |
| D6 | Médio | i18n | `<html lang="en">` no shell do dashboard autenticado, que deveria ser pt-BR | `index.html:2` | Trocar para `lang="pt-BR"` |
| E4 | Médio | CI | Nenhum workflow de CI configurado — gate de lint/typecheck/build depende de execução manual | `.github/` (inexistente) | Criar GitHub Actions mínimo rodando lint/typecheck/build |
| E10 | Médio | Qualidade | `key={i}` em lista dinâmica de mensagens de chat | `src/pages/TocaTrIA.jsx:145` | Usar id estável da mensagem |
| E11 | Médio | Dívida técnica | `src/pages/Plans.jsx` (309 linhas) é código morto, sem nenhuma referência | `src/pages/Plans.jsx` | Remover o arquivo |
| A11 | Baixo | Segurança | `stripeWebhook` sem idempotência explícita por `event.id` | `base44/functions/stripeWebhook/entry.ts` | Registrar `event.id` processado se o volume crescer |
| A13 | Baixo | Segurança/RLS | `ServiceRequest.create` não exige `account_type` | `base44/entities/ServiceRequest.jsonc:84-87` | Alinhar com padrão das demais entidades |
| A14 | Baixo | Segurança | `generateWithAI` sem rate limit nem distinção de papel para tipos administrativos | `base44/functions/generateWithAI/entry.ts:9-13` | Adicionar rate limit e checagem de `account_type` se custo for relevante |
| A15 | Baixo | Segurança | `index.html` sem Content-Security-Policy | `index.html` | Adicionar meta CSP sugerida no relatório da Seção A |
| C12 | Baixo | Design system | Hex hardcoded (`#F07A2E`) fora de tokens em 2 arquivos | `src/pages/Settings.jsx:341-342`, `ConciergeKPIs.jsx:22,86-93` | Trocar por `hsl(var(--primary))` |
| C13 | Baixo (requer teste) | PWA | Ícones do manifest sem variante "safe zone" para `maskable` | `public/manifest.json:14-33` | Gerar ícone maskable dedicado |
| C14 | Baixo | Acessibilidade | `user-scalable=no` desabilita pinch-zoom (WCAG 1.4.4) | `index.html:7` | Remover `user-scalable=no`/`maximum-scale=1.0` |
| C15 | Baixo (requer teste) | Mobile | `PwaInstallPopup` não soma `env(safe-area-inset-bottom)` explicitamente | `src/components/PwaInstallPopup.jsx:69` | Testar em iPhone com home-indicator grande |
| D2 | Baixo | i18n | 12 chaves i18n mortas (`pillar.*`) no dicionário institucional | `public/institucional/index.html:3308-3313` | Remover chaves não usadas |
| E5 | Baixo | Organização | `CHECKPOINT_FASE1.md`/`PROMPT_AUDITORIA.md` na raiz do repo | raiz do projeto | Mover para `docs/` |
| E12 | Baixo | Dívida técnica | 9 componentes com mais de 400 linhas, candidatos a decompor | vários (ver `DIVIDA_TECNICA.md`) | Quebrar em subcomponentes/hooks |
| E13 | Baixo | Qualidade | 1 erro real de lint (import não usado) | `src/components/layout/AppLayout.jsx:11` | Remover import de `ConviteNecessario` (ou religá-lo, ver A7) |
| B8 | Baixo | Dados | Campos de câmbio existem no schema mas sem UI que os grave | `base44/entities/Billing.jsonc:104-126` | Documentar como não implementado ou remover do schema |
| B9 | Baixo | UX/Dados | Pipeline Kanban permite qualquer transição de status sem confirmação/log | `src/pages/Pipeline.jsx:12-17,98-106` | Opcional: confirmação ao reverter etapa |

## Contagem por severidade

- **Crítico:** 12
- **Alto:** 16
- **Médio:** 18
- **Baixo:** 15

## Observação sobre os dois problemas relatados pelo usuário

1. **"Página quebrada no mobile"** — causa mais provável é **C1** (`ClientProfileSheet` com largura fixa de 420px), reforçada por **C2** (perda de acesso ao menu em Financeiro/Pedidos), **C3** (FABs sobrepostos no Pipeline) e **C4** (grids da landing sem breakpoint). Ver `C_FRONTEND_MOBILE.md` para a análise completa.
2. **"Builder com problema de colocar o site no ar"** — dois candidatos fortes e independentes: **E2** (build sem `VITE_BASE44_APP_ID`, app publicado com API quebrada) e **E9** (home "/" depende do boot completo do React só para redirecionar). Ver `E_PERFORMANCE_QUALIDADE.md`.

Nenhuma afirmação acima foi inventada — toda evidência foi lida diretamente do código nesta sessão. Itens marcados "requer teste em runtime" nos arquivos de seção não puderam ser confirmados por leitura estática.
