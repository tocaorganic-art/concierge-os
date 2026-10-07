# PROMPT DE AUDITORIA COMPLETA — Toca OS (Concierge OS)

Copie o bloco abaixo e execute com o Claude Code na raiz do repositório (ambiente git).

---

Você é um auditor sênior de software (arquitetura, segurança, dados, front-end, back-end, SEO e UX). Audite TODO o repositório deste produto — o site institucional público E o dashboard aplicativo (Toca OS, um sistema premium para concierges de luxo independentes). Você tem acesso total aos arquivos. NÃO altere nenhum arquivo: produza apenas relatórios com achados, evidências (caminho de arquivo + linha + trecho) e recomendações priorizadas. Ao final, entrega os relatórios como arquivos em `docs/auditoria/` (um por seção + um `RESUMO.md` com o ranking de severidade).

## 1. Contexto do produto (leia antes de auditar)

- **Stack:** React 18 + Vite + Tailwind CSS (dark theme, tokens em `src/index.css` + `tailwind.config.js`), backend Base44 (entidades em `base44/entities/*.jsonc`, funções em `base44/functions/*/entry.ts`, workflows em `base44/workflows/*.jsonc`, agentes em `base44/agents/*.jsonc`), Stripe para assinaturas/checkout, Google Sheets/Calendar via conectores, Meta Pixel para conversão.
- **Site institucional:** página estática em `public/institucional/index.html` (rota `/institucional/`), com sistema i18n próprio (objeto `i18n` pt/es/en + `setLang` + persistência em localStorage + atributos `data-i18n`).
- **Dashboard:** rotas em `src/App.jsx`; layout autenticado em `src/components/layout/AppLayout.jsx` com whitelist de rotas para contas cliente (`CLIENT_ALLOWED_PATHS`).
- **Papéis/segurança:** `UserProfile.account_type` = `equipe` | `cliente`; `role` admin/user; RLS por entidade (campo `rls` nos jsonc, incluindo RLS de campo para dados financeiros internos como `Billing.alocacao`, `Expense.margem_admin`, `Proposal.contrato_dados_extraidos`, `documentos_admin`, `alertas_contratuais`, `versoes_anteriores`).
- **Fluxo de convite:** convite de cliente → `UserProfile` com `invite_email`/`user_id` → vinculação no primeiro login via `base44/functions/linkInvitedAccount`; acesso de conta cliente restrito aos próprios dados via RLS (`data.client_id`).
- **Financeiro:** entidades `Billing`, `Recebimento` (ledger imutável, estorno por registro negativo), `Expense`, `ContaPagar`, `ContratoFornecedor`, `BillingCategory`; regras em `src/lib/finance.js`, `src/lib/splitRepasseMargem.js`, `src/lib/categoriasCatalogo.js`, `src/lib/uiTones.js`.
- **Entidades principais:** User (built-in), UserProfile, Client, ClientMemory, Proposal, ProposalTemplate, Billing, Recebimento, Expense, ContaPagar, ContratoFornecedor, BillingCategory, Task, Hospede, Comentario, ServiceRequest, Partner, Revenue, WaitlistEntry.
- **Requisitos de negócio invioláveis (auditados como regra, não como preferência):**
  1. Toda interface autenticada em português; idioma do portal do cliente pode ser pt-BR/es/en (`Client.idioma_padrao`).
  2. "Jornada da viagem" (`Proposal.etapa_jornada`, etapas 1–5) é 100% manual, definida pelo admin — NUNCA derivada de datas, pagamentos ou tempo.
  3. Alertas operacionais/deadlines (ex.: `DeadlineAlerts`, `checkDeadlineAlerts`, workflow "Alerta de Prazos") só visíveis a admin/equipe — nunca ao cliente.
  4. Admin master (suporte@trancosoresolve.com.br) tem acesso irrestrito.
  5. Comprovantes: histórico incremental em `Billing.comprovantes` (nunca sobrescrever), campo legado `comprovante_url` só espelha o último.
  6. Recebimentos nunca são editados/apagados; correção = novo registro negativo com `estorno_de_id`.
  7. `Billing.status` é derivado do saldo em `src/lib/finance.js`; só `cancelado` é manual e exige `motivo_cancelamento`.
  8. Chat flutuante (FloatingChat) visível em todas as páginas; mensagens nunca enviadas automaticamente (`Task.mensagem_rascunho` é só rascunho).
  9. Animações: performáticas, sem vídeo/áudio excessivos, respeitar `prefers-reduced-motion`; banner de vídeo do dashboard respeita reduced-motion e não tem texto sobreposto ao vídeo.
  10. UI mobile sem sobreposição com a barra de navegação inferior.

## 2. Escopo da auditoria (execute TODAS as seções)

### A. Segurança e controle de acesso (prioridade máxima)
1. **RLS de todas as entidades:** para cada `base44/entities/*.jsonc`, valide cada operação (create/read/update/delete) e cada RLS de campo. Procure: campos sensíveis sem RLS (dados financeiros, `notas`, documentos de ID, chaves Pix, `mensagem_rascunho`), regras `$or` frouxas, update/delete que permita escalonamento (ex.: cliente editar `created_by_id`, `valor`, `alocacao`, `natureza`), leitura cruzada entre clientes (`data.client_id` mal aplicado). Simule mentalmente: cliente A vê/edita algo do cliente B? Cliente altera cobrança ou proposta? Usuário sem perfil faz o quê?
2. **Fluxo de convite e vinculação:** audite `linkInvitedAccount` (matching case-insensitive, 24h), `grantUserAccess`, `Settings.jsx` (lógica de convite que vincula conta existente), `ConviteNecessario.jsx`, gating no `useUserProfile.js`/`papel.js`, whitelist `CLIENT_ALLOWED_PATHS` vs. RLS real. Procure brechas: conta recém-criada sem convite vendo dados; convite expirado; perda de vínculo; race conditions no primeiro login.
3. **Loop de autenticação pós-login Google (BUG CONHECIDO):** investigue a fundo em `src/lib/AuthContext.jsx`, `src/components/ProtectedRoute.jsx`, `SocialAuthButtons.jsx`, sanitização de token, `safeReturnTo`/`authReturnTo.js`, rotas `/` (institucional) vs `/dashboard`, e `returnTo` nos fluxos OAuth/MCP. Identifique a causa raiz do loop em contas admin e proponha correção precisa.
4. **Funções backend:** para cada `base44/functions/*/entry.ts` (stripeCheckout, stripeWebhook, stripePortal, stripeSetup, grantUserAccess, linkInvitedAccount, sendWelcomeEmail, generateWithAI, checkDeadlineAlerts, checkPaymentReminders, exportBillingToSheets, syncTaskToCalendar): verificação de autenticação/autorização do chamador, validação de input, uso de segredos (nunca expor valores em resposta/log), webhooks Stripe com verificação de assinatura e idempotência, tratamento de erros que não vaze stack.
5. **Página OAuth/MCP:** `src/pages/OAuthConsent.jsx`, `base44/mcp/config.json`, página `Connect.jsx` — consentimento genuíno, sem redirecionamentos abertos, escopos mínimos.
6. **Headers e CVEs:** dependências desatualizadas/vulneráveis em `package.json` (relate versões e CVE conhecidas), `public/sw.js` (cache de conteúdo autenticado?), CSP sugerida, `index.html` (scripts externos: Meta Pixel — valide integridade e privacidade).

### B. Corretude da lógica de negócio / dados
1. **Financeiro:** re-execute mentalmente `src/lib/finance.js` (derivação de status, saldo, KPIs de custódia/repasse, "Faturado do Mês" por competência usando `data_emissao` vs fallback `created_date`), `splitRepasseMargem.js` (soma de `alocacao` = `valor`), `Recebimento` ledger (estornos, soma por Billing), validação "Parcela X de Y" (`numero_parcela`/`total_parcelas` vs valor da proposta), moeda/câmbio (BRL/USD/ARS, `valor_original`/`taxa_cambio`).
2. **Pipeline e propostas:** transições de status (`lead→proposta→confirmado→concluido→cancelado`), `data_validade` (expiração só para lead/proposta), `itens_contrato` vs `Billing` (regra: entidades independentes), templates (`ProposalTemplate` → `ProposalFormDialog` → pré-preenchimento), leitura de contrato por IA (`LeituraContratoModal`, `contrato_dados_extraidos` — confirmação explícita do admin obrigatória, nunca escrita sozinha).
3. **Agenda/eventos (Task):** modal de eventos, checklist, fotos, comentários, histórico, responsável, lembretes, `visivel_cliente` (RLS exige `visivel_cliente: true` para cliente — verifique que NENHUMA tela do admin cria tarefa visível ao cliente por engano e que o cliente só vê o que deve), sync Google Calendar (`syncTaskToCalendar` + workflow "Sync Tarefas Google Agenda").
4. **Workflows:** `base44/workflows/*.jsonc` (Alerta de Prazos, Alerta de Pagamentos Pendentes, Sync Tarefas Google Agenda) — condições, duplicidade de disparos, erros silenciosos, horário (timezone America/Bahia).
5. **Agentes IA:** `base44/agents/agente_preferencias.jsonc`, `assistente_roteiros.jsonc`, `assistente_propostas.jsonc` — permissões mínimas (entidades expostas), prompts, risco de escrever dados errados, conformidade com RLS.
6. **Integridade de dados:** campos denormalizados (client_nome em Billing/Proposal/Task) sem mecanismo de atualização em cascata; `Proposal.versoes_anteriores`/`alertas_contratuais` (entrada manual) — consistência; migração/legado (`comprovante_url` deprecated, `backfill-recebimentos-legado.mjs`).

### C. Front-end / UX
1. **Rotas e navegação:** `src/App.jsx` (todas as rotas alcançáveis, redirects `/planos`, `/portal`, `/home`), sidebar/topbar/drawer/bottom-nav mobile sem sobreposição (verifique z-index, safe areas, `pt-14 pb-16`), GlobalSearch, links mortos.
2. **Bugs conhecidos:** (a) Onboarding tour cobrindo o `ProposalFormDialog` no carregamento inicial — reproduza pela lógica (ordem de montagem, z-index, timing) e proponha correção; (b) tour do cliente (`ClientTour`) e tutorial (`TutorialModal`) — flags `tutorial_seen_*`/`onboarding_concluido` consistentes entre dispositivos.
3. **Telas cliente vs admin:** cada página de rota permitida a cliente (`Dashboard`, `Faturamento`, `Agenda`, `Relatorios`, `Solicitacoes`, `MeuGrupo`, `MeuContrato`, `Documentos`, `MeuPerfil`, `Chat`, `TocaTrIA`) — confirme que não vaza nada admin (via UI ou via cache de dados do TanStack Query entre trocas de papel "ver como cliente" — cache isolado?).
4. **Estados de UI:** loading/empty/error em todas as páginas; dados zerados por padrão no primeiro acesso (requisito); esqueleto/feedback durante integrações.
5. **Design system:** uso consistente dos tokens (nada de hex hardcodado fora de casos justificados), `liquid-glass` aplicado conforme padrão, contraste no dark mode (WCAG AA para textos sobre glass/imagens), `prefers-reduced-motion` em TODAS as animações (framer-motion, confetti, banner de vídeo, onboarding, chat).
6. **Mobile/PWA:** `public/manifest.json`, `PwaInstallPopup`, `sw.js`, safe areas, alvos de toque ≥44px, overflow horizontal em 373px (varra componentes de páginas principais).
7. **Formulários:** validação (react-hook-form + zod onde aplicável), mensagens de erro amigáveis em PT, double-submit, perda de dados ao fechar modal.

### D. i18n e conteúdo
1. **Institucional:** `public/institucional/index.html` — dicionário i18n pt/es/en completo (chaves órfãs, chaves sem tradução, HTML dentro dos valores com classes preservadas, persistência localStorage, `<html lang>` sincronizado, `data-i18n` faltando em elementos visíveis), acessibilidade dos controles de idioma (aria-pressed), fallback.
2. **Dashboard:** `src/lib/i18n.jsx` + `i18nResources.js` — chaves faltando, textos hardcoded em JSX (varra páginas), textos de autenticação 100% em PT (requisito).
3. **Emails:** `base44/emails/*.html` + `sendWelcomeEmail` — variáveis preenchidas, links apontando para o domínio correto, conformidade com o tema da marca.

### E. Performance e qualidade de código
1. **Bundle:** imports não- tree-shakeáveis (lodash inteiro, moment vs date-fns duplicados — ambos instalados: padronize), chunks pesados (recharts, three, jspdf, html2canvas, react-quill, leaflet) — lazy loading onde não é rota crítica, dependências instaladas mas não usadas.
2. **React:** hooks em loops/condicionais, chaves de lista, re-renders desnecessários, queries sem invalidação correta, race conditions em effects, memórias de listeners/intervalos sem cleanup.
3. **Duplicação/mortos:** código morto (ex.: `src/pages/Plans.jsx` ainda referenciado?), componentes >300 linhas a decompor, funções utilitárias duplicadas, `scripts/*.mjs` documentados.
4. **Git/CI:** estado do repositório (conflitos pendentes em `public/institucional/index.html`?), arquivos de debug/checkpoint esquecidos (`CHECKPOINT_FASE1.md`, `CLAUDE.md` — sensível?), `.gitignore` completo (segredos, builds), `docs/GITHUB_WORKFLOW.md` seguido.

### F. SEO, marketing e legal
1. `index.html` + página institucional: meta tags, Open Graph, canonical, sitemap/robots, favicon, hreflang (pt/es/en), título/descriptions por idioma.
2. Meta Pixel: eventos corretos (Purchase na `/obrigado` com parâmetros por plano), sem PII, consentimento (LGPD).
3. **LGPD/privacidade:** dados pessoais de clientes/hóspedes (documentos, voos) — retenção, exposição em URLs, política de privacidade vinculada no institucional, termos no cadastro.

## 3. Formato de entrega

1. **`docs/auditoria/RESUMO.md`** — tabela de achados: ID | Severidade (Crítico/Alto/Médio/Baixo) | Área | Título | Arquivo(s) | Recomendação em 1 linha. Ordene por severidade.
2. **Um arquivo por seção (A–F)** com achados detalhados: evidência (arquivo:linha + trecho real), impacto, correção proposta (passo a passo, sem aplicar).
3. **`docs/auditoria/CAUSAS_RAIZ.md`** — para os 3 bugs conhecidos (loop auth Google, onboarding × ProposalFormDialog, acesso do cliente ao próprio dashboard), traga a causa raiz provável com a cadeia de execução completa e o patch mínimo proposto (diff descrito, não aplicado).
4. **`docs/auditoria/DIVIDA_TECNICA.md`** — prioridade de refatoração, dependências a remover/atualizar, padronizações (moment→date-fns, lodash, etc.).
5. Ao final de cada arquivo, uma seção "O que está bom" (pontos fortes reais, com evidência) — não invente elogios.

## 4. Regras

- NÃO modifique nenhum arquivo, NÃO faça commit, NÃO instale nada. Apenas leia, analise e escreva os relatórios em `docs/auditoria/`.
- Toda afirmação precisa de evidência citada (caminho:linha). Se algo não pôde ser verificado estaticamente, marque como "requer teste em runtime" e descreva o teste exato.
- Não sugira reescritas gerais: cada recomendação deve ser o mínimo que corrige o problema preservando o comportamento e as 10 regras de negócio da seção 1.
- Responda em português (pt-BR).