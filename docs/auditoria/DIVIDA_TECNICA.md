# Dívida Técnica — Prioridade de Refatoração

Consolidado a partir dos achados de todas as seções. Ordenado por impacto esperado / facilidade de execução.

## 1. Build e toolchain (resolver primeiro — impacta todo o resto)

1. **Unificar gerenciador de pacotes.** Hoje há `package-lock.json` e `pnpm-lock.yaml` simultâneos, e `package.json:9` (script `lint`) chama `pnpm` de dentro de um fluxo `npm` (`base44/config.jsonc` declara `installCommand: npm install`). Escolher um (recomendado: manter `npm`, já que é o que `base44/config.jsonc` assume) e remover o lockfile do outro. Ver `E_PERFORMANCE_QUALIDADE.md` (E1).
2. **Corrigir o `buildCommand` do Base44.** `base44/config.jsonc` roda `npm run build` (= `vite build` puro) em vez de `base44 build`/`base44 deploy --build`, deixando `VITE_BASE44_APP_ID` (e demais env vars do plugin) de fora do bundle final — toda chamada de API do app publicado falha. Criar `.env.example` documentando `VITE_BASE44_APP_ID`, `VITE_BASE44_FUNCTIONS_VERSION`, `VITE_BASE44_APP_BASE_URL`. Ver `E_PERFORMANCE_QUALIDADE.md` (E2) — provável causa raiz do "builder com problema de colocar o site no ar".
3. **Remover `logLevel: 'error'` de `vite.config.js:7`** — está mascarando avisos legítimos do Vite (incluindo o aviso de chunk grande que apontaria para o problema #4 abaixo).
4. **Criar um workflow de CI mínimo** (GitHub Actions) rodando lint + typecheck + build a cada PR — hoje esse gate depende 100% de execução manual, apesar de ser pré-requisito de merge documentado no `CLAUDE.md`.
5. **Mover `CHECKPOINT_FASE1.md` e `PROMPT_AUDITORIA.md`** da raiz para `docs/`.

## 2. Dependências a remover/atualizar

1. **Remover dependências instaladas e nunca importadas:** `lodash`, `moment`, `three`, `react-leaflet`, `react-quill` (`package.json:63,65,74,76,83`). Confirmado por busca em todo `src/` — zero usos.
2. **Padronizar variável de ambiente da chave Stripe** — `stripeWebhook` usa `STRIPE_SECRET_KEY`, as demais functions usam `MY_STRIPE_SK`. Escolher uma.
3. **Rodar `npm audit`/`pnpm audit`** para confirmar a árvore real de dependências e CVEs vigentes (não foi possível confirmar a versão resolvida de `quill`, dependência interna de `react-quill`, sem lockfile consultado nesta auditoria).

## 3. Performance (bundle)

1. **Code-splitting de rotas com `React.lazy()` + `Suspense`.** Hoje 0 rotas são lazy — todas as 27 páginas (incluindo as que usam `recharts`) entram no bundle de 1,8MB carregado até na tela de Login. Prioridade: `Reports.jsx`, `ConciergeKPIs.jsx`, `Billing.jsx`, `Despesas.jsx`.
2. **Eliminar o redirect client-side de `/` para `/institucional/index.html`** (`src/pages/Institucional.jsx`) — hoje a home pública carrega o SPA inteiro do dashboard só para redirecionar via JS. Servir a página institucional diretamente a nível de servidor/CDN.
3. **Extrair as 14 imagens base64 inline** de `public/institucional/index.html` (1,9MB de HTML) para arquivos `.jpg`/`.webp` separados, como já é feito com as outras 8 imagens da mesma página.
4. Replicar para o resto do app o padrão de `import()` dinâmico já usado corretamente para `jspdf`/`html2canvas`.

## 4. Padronização de formulários

1. **`react-hook-form` + `zod` estão instalados mas não usados em nenhum formulário real** (só existe o boilerplate `src/components/ui/form.jsx`). Todos os ~15 diálogos de formulário usam `useState` manual + validação ad hoc, com mensagens de erro inconsistentes entre telas. Migrar progressivamente, começando pelos formulários financeiros (`BillingFormDialog`, `ExpenseFormDialog`) que têm mais regras de validação implícitas.
2. **Fórmula de parcelas duplicada** em `BillingFormDialog.jsx:172-186` — deveria reusar `dividirEmParcelas()` de `src/lib/finance.js` (regra R8 do próprio módulo: "nenhuma fórmula duplicada nas telas").

## 5. i18n

1. **65 strings em PT hardcoded** mesmo nas páginas já cobertas pela regra `i18next/no-literal-string` (hoje só `warn`, escondida pelo `--quiet` do `npm run lint`). Ver `D_I18N.md` (D4).
2. **Workaround de 3 tentativas não resolvido** em `src/lib/i18n.jsx:120-149` para um bug de produção do i18next (chave aparecendo em vez do texto traduzido) — vale investigar a causa raiz antes que o paliativo falhe em um cenário não coberto.
3. Atualizar `hero.eyebrow`/`hero.lede` do institucional (ainda fala "Trancoso" em vez de "Brasil" nas 3 línguas) e remover as 12 chaves `pillar.*` mortas.
4. Corrigir `<html lang="en">` no `index.html` raiz (shell do dashboard autenticado, que deveria ser `pt-BR`).

## 6. Código morto e componentes grandes

1. **Remover `src/pages/Plans.jsx`** (309 linhas) — confirmado sem nenhuma referência no projeto.
2. **Remover ou religar `ConviteNecessario`** (`src/components/layout/AppLayout.jsx:11`) — hoje é um import morto que causa o único erro real de lint do projeto, mas a causa raiz é de segurança (ver `A_SEGURANCA.md`, achado A7): o componente foi desenhado para bloquear acesso sem convite e nunca foi ligado.
3. **Componentes acima de 400 linhas, candidatos a decompor em subcomponentes/hooks:** `BillingFormDialog.jsx` (646), `Billing.jsx` (525), `ProposalFormDialog.jsx` (502), `Dashboard.jsx` (498), `ExpenseFormDialog.jsx` (449), `TutorialModal.jsx` (443), `LeituraContratoModal.jsx` (439), `Reports.jsx` (412), `Settings.jsx` (403).
4. Unificar o padrão de flag de "já visto" entre `TutorialModal` (hoje só `localStorage`) e `ClientTour` (já persiste no perfil do backend) — ver `C_FRONTEND_MOBILE.md` (C8).

## 7. Design system / acessibilidade

1. **Isolar a regra global `min-height/min-width: 44px`** (`src/index.css:147-152`) em uma classe utilitária (`.tap-target`) em vez de aplicar a todo `button`/`a`/`[role=button]` — hoje conflita com variantes `sm`/`icon` do componente `Button`, forçando botões pequenos a renderizar maiores que o desenhado.
2. **Adicionar regra global `prefers-reduced-motion`** em `index.css` como rede de segurança, além dos tratamentos pontuais já existentes no Dashboard.
3. Trocar os 2 usos de hex hardcoded (`#F07A2E`) em `Settings.jsx`/`ConciergeKPIs.jsx` por `hsl(var(--primary))`.
4. Adicionar media queries mobile em `.pillars-grid`/`.services-grid` da página institucional.

## 8. Segurança (itens de dívida técnica, não emergenciais — ver `A_SEGURANCA.md` para os críticos)

1. Adicionar `rls.update` por campo em `Billing` (valor/status/natureza/categoria/alocacao), seguindo o padrão já correto de `Hospede.jsonc`.
2. Padronizar todas as `base44/functions/*` para validar o chamador com `base44.auth.me()` no topo, seguindo o padrão de referência já usado em `exportBillingToSheets`/`grantUserAccess`/`stripeSetup`.
3. Migrar uploads de documentos pessoais (`MeuGrupo.jsx`, formulários de billing/expenses) de `Core.UploadFile` (público) para `Core.UploadPrivateFile` + `CreateFileSignedUrl`, como já feito em `ChatAnexo.jsx`.
4. Adicionar CSP mínima em `index.html` (sugestão completa em `A_SEGURANCA.md`).

## 9. Legal/LGPD (não é dívida técnica de código, mas bloqueia lançamento — ver `F_SEO_LEGAL.md`)

1. Criar Política de Privacidade e Termos de Uso, com checkbox de aceite no cadastro.
2. Decidir política de retenção/exclusão para documentos pessoais (voos, CPF/passaporte) hoje em storage público e sem expiração.
