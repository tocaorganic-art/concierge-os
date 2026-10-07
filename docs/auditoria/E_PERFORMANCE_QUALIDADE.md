# Seção E — Performance e Qualidade de Código

Repositório: `/home/user/concierge-os` (branch `audit/auditoria-completa-2026-10`). Auditoria somente leitura. `npm run build`, `npx tsc -p ./jsconfig.json` e `npx eslint .` foram executados de fato nesta sessão; evidências citam arquivo:linha real.

## E.4 — Git/CI/Build (prioridade — queixa real do usuário: "builder com problema de colocar o site no ar")

### [CRÍTICO] E1 — "npm run lint" quebra em qualquer ambiente sem pnpm instalado global
- `package.json:9` → `"lint": "eslint . --quiet && pnpm run i18n:check"`
- O script oficial de lint (pré-requisito de merge segundo `CLAUDE.md`: "assim que os testes (lint/typecheck/build) passarem") chama `pnpm` de dentro de um script `npm`. `base44/config.jsonc:4` declara `"installCommand": "npm install"` — o projeto assume ambiente **npm**, não pnpm. Se o runner de build/CI ou o ambiente de deploy do Base44 não tiver `pnpm` global, `npm run lint` falha com "pnpm: command not found", travando o fluxo de merge/deploy.
- Reforça o problema: **dois lockfiles no repo** — `package-lock.json` (369KB) e `pnpm-lock.yaml` (261KB) simultâneos, sinal de mistura de gerenciadores (risco real de versões de dependência divergentes entre quem builda localmente e em produção).
**Correção mínima:** trocar `pnpm run i18n:check` por `npm run i18n:check` em `package.json:9`; escolher um único gerenciador de pacotes e remover o lockfile do outro.

### [CRÍTICO] E2 — Build "silencioso" sem o app id do Base44 — explica "site no ar mas quebrado"
`npm run build` foi executado de fato. Saída completa:
```
> base44-app@0.0.0 build
> vite build
[base44] Warning: VITE_BASE44_APP_ID is not set — this build
[base44] will not know its app id and its API calls will fail.
[base44] Build with:  base44 build   (or base44 deploy --build)
[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)
```
Exit code 0. `dist/` é gerado normalmente (index.html, assets, institucional/, manifest.json, sw.js) — o build "funciona" sem erro vermelho, mas o próprio plugin avisa que **as chamadas de API do app vão falhar** por faltar `VITE_BASE44_APP_ID`.
- `vite.config.js:1-17` usa `@base44/vite-plugin` sem config de env.
- `src/lib/app-params.js:40-46` resolve `appId` via `import.meta.env.VITE_BASE44_APP_ID` (injetada só em build time pelo Vite). Sem ela, `appId` fica `null`/`undefined` no bundle final.
- `src/api/base44Client.js:5-12` cria o client do SDK com esse `appId` nulo — `auth.me()`, `entities.*`, toda autenticação e dado passam a falhar em runtime.
- `base44/config.jsonc:3-7` define `"buildCommand": "npm run build"` — ou seja, o fluxo de deploy roda `vite build` puro, **não** `base44 build`/`base44 deploy --build` (o comando que o próprio plugin recomenda para injetar essas env vars). Não existe `.env`, `.env.example` nem documentação (`docs/`, `README.md`, `CLAUDE.md`) explicando que `VITE_BASE44_APP_ID`/`VITE_BASE44_FUNCTIONS_VERSION`/`VITE_BASE44_APP_BASE_URL` precisam existir antes do build.

Compatível com o relato do usuário: o deploy pode completar com sucesso (exit 0, arquivos gerados), mas o app publicado fica com todas as chamadas de API quebradas — sintoma clássico de "subiu, mas não funciona", sem erro óbvio no log.

**Requer confirmação em runtime:** verificar no painel Base44 se o pipeline de deploy real injeta essas env vars por fora do `buildCommand` configurado, ou se depende só dele (caso em que o bug é exatamente este).

**Correção mínima:** mudar `buildCommand` em `base44/config.jsonc` para `base44 build` (ou garantir que o pipeline exporte `VITE_BASE44_APP_ID` etc. antes de `npm run build`); criar `.env.example` documentando as 3 variáveis.

### [ALTO] E3 — `vite.config.js:7` com `logLevel: 'error'` mascara todo o output normal do Vite
`logLevel: 'error', // Suppress warnings, only show errors` — suprime inclusive os avisos de chunk grande (`(!) Some chunks are larger than 500 kB...`) que o Vite emitiria sobre o bundle de 1,8MB (ver E6). Quem roda o build nunca vê esse aviso.
**Correção mínima:** remover `logLevel: 'error'` ou trocar para `'warn'`.

### [MÉDIO] E4 — Nenhum CI configurado
`find .github -type f` → vazio. Nenhum workflow de GitHub Actions. `CLAUDE.md` e `docs/GITHUB_WORKFLOW.md` descrevem fluxo de branch+PR com gate "lint/typecheck/build", mas depende 100% de execução manual — nenhuma automação garante isso antes do merge.

### [BAIXO] E5 — `CHECKPOINT_FASE1.md` e `PROMPT_AUDITORIA.md` na raiz do repo
Arquivos de checkpoint/anotação versionados na raiz (não em `docs/`), poluindo o root e não documentados no README. `CHECKPOINT_FASE1.md` não tem conteúdo sensível (é só changelog), mas merece mover para `docs/`.

### [INFORMATIVO] `npx tsc -p ./jsconfig.json` → sem erros. `npx eslint . --quiet` → 1 erro (import não usado, ver E13).

## E.1 — Bundle e dependências

### [CRÍTICO] E6 — Bundle principal de 1,8MB em um único chunk, zero code-splitting de rotas
`dist/assets/index-X0NeB3_O.js` = **1.817.720 bytes**, carregado de uma vez para qualquer rota, inclusive login. `src/App.jsx:12-38` importa **todas** as 27 páginas de forma estática/eager — nenhum `React.lazy()` no projeto (grep vazio). Toda a árvore de rotas, incluindo páginas com `recharts` (`Reports.jsx`, `ConciergeKPIs.jsx`, `DashboardRevenueChart.jsx`), entra no mesmo chunk da tela de Login.
**Correção mínima:** `React.lazy()` + `<Suspense>` nas rotas protegidas, especialmente `Reports`, `ConciergeKPIs`, `Billing`, `Despesas`.

### [BOM] `jspdf` já corretamente code-splitted via import dinâmico
`src/components/events/EventPdfButton.jsx:28` e `ProposalPdfButton.jsx:16`: `const { jsPDF } = await import("jspdf");` — por isso `jspdf.es.min-*.js` (384KB) e `html2canvas.esm-*.js` (200KB) aparecem como chunks separados. Padrão certo; falta replicar para o resto do app.

### [ALTO] E7 — 5 dependências pesadas instaladas e totalmente sem uso no código
Confirmado por busca em todo `src/` (zero resultados cada): `lodash` (package.json:63), `moment` (:65), `three` (:83), `react-leaflet` (:74), `react-quill` (:76). Todas em `dependencies`, mas nenhum `import`/`require` em arquivo `.js`/`.jsx` fora de `node_modules`.
`date-fns` (não `moment`) é a lib de datas de fato usada (7 arquivos) — não há duplicação ativa no bundle final, mas `moment` continua instalada sem necessidade.
**Correção mínima:** remover `lodash`, `moment`, `three`, `react-leaflet`, `react-quill` do `package.json`.

### [ALTO] E8 — Página institucional estática pesa 1,9MB por imagens embutidas em base64
`public/institucional/index.html` tem **1,9MB** de tamanho total; 14 imagens codificadas inline em base64 (`data:image/jpeg;base64`), uma delas com ~524KB de string base64 (≈390KB binário). Força o navegador a baixar o HTML inteiro antes de renderizar qualquer coisa — sem cache de imagem separado, sem lazy-loading. Prejudica LCP/FCP da landing pública. O projeto já sabe fazer certo: existem 8 arquivos de imagem separados em `public/institucional/images/*.jpg` usados em outras partes da mesma página — só essas 14 ficaram em base64.
**Correção mínima:** extrair as 14 imagens para arquivos `.jpg`/`.webp` próprios em `public/institucional/images/`.

### [CRÍTICO] E9 — Página "/" faz redirect 100% client-side via JS para o site institucional, custando o carregamento do bundle inteiro do dashboard
`src/pages/Institucional.jsx:7-11`:
```jsx
export default function Institucional() {
  React.useEffect(() => {
    window.location.replace("/institucional/index.html");
  }, []);
  return null;
}
```
Renderizado pela rota `"/"` (`App.jsx:73`). Visitar a home **carrega o SPA inteiro primeiro** (bundle de 1,8MB), monta React, decide a rota, e só então dispara o redirect — dobro de carregamento, delay perceptível, redirect 200 OK via JS (não 301/302 HTTP) que motores de busca podem não seguir de forma confiável. Quebra a relação entre a URL pública ("/") e a URL real de conteúdo, que tem `<link rel="canonical" href="https://tocaconciergeos.com.br">` sem o path `/institucional/index.html` (inconsistência de canonicalização, ver F2).

Junto com E2 (`VITE_BASE44_APP_ID`), forte candidato ao relato do usuário sobre o site "não subir" ou carregar mal.

**Correção mínima:** servir `/institucional/index.html` diretamente como home a nível de servidor/CDN (rewrite estático), eliminando o componente React de redirecionamento.

## E.2 — React

### [MÉDIO] E10 — `key={i}` (índice) em lista dinâmica de mensagens de chat
`src/pages/TocaTrIA.jsx:145`: `<ChatMessage key={i} msg={msg} />` dentro de `.map((msg, i) => ...)` de histórico que cresce/pode ser filtrado — risco de re-render incorreto se mensagens forem removidas/reordenadas. Demais casos de `key={i}` (gráficos Recharts, passos de tutorial, badges estáticos) têm risco baixo por serem listas fixas.
**Correção mínima:** usar id estável da mensagem como key.

### [BOM] Nenhum listener/intervalo sem cleanup encontrado
Revisados 14 pontos de `setInterval`/`addEventListener` (`TutorialModal.jsx:115,306`, `TaskNotifications.jsx:33`, `FloatingChat.jsx:25`, `PwaInstallPopup.jsx:37`, `KpiCard.jsx:19`, `GlobalSearch.jsx:88-89`, `use-mobile.jsx:13`, `main.jsx:12,24`, etc.) — todos com cleanup correspondente.

### [BAIXO] `ClientProfile.jsx:29-77` usa `useMutation` mas leitura via `useEffect`+`useState` manual
Inconsistente com o padrão do resto do app (26 arquivos usam `useMutation`, 28 usam `invalidateQueries`). Não é bug funcional, é duplicação de padrão de data-fetching.

## E.3 — Duplicação/código morto

### [MÉDIO] E11 — `src/pages/Plans.jsx` (309 linhas) é código morto, sem nenhuma referência
`grep -rln "pages/Plans"` em todo `src/` → vazio. `App.jsx` não importa `Plans`; rota `/planos` faz `<Navigate to="/configuracoes" replace />` direto, com comentário (102-107) explicando que a página mostrava planos de "um produto diferente" e "nunca foi o sistema de planos real deste app".
**Correção mínima:** remover o arquivo.

### [BAIXO] E12 — Componentes grandes (candidatos a decompor)
`BillingFormDialog.jsx` (646 linhas), `Billing.jsx` (525), `ProposalFormDialog.jsx` (502), `Dashboard.jsx` (498), `ExpenseFormDialog.jsx` (449), `TutorialModal.jsx` (443), `LeituraContratoModal.jsx` (439), `Reports.jsx` (412), `Settings.jsx` (403) — todos acima de 400 linhas.

### [BAIXO] E13 — 1 erro de lint real
`npx eslint . --quiet` → `src/components/layout/AppLayout.jsx:11:8 error 'ConviteNecessario' is defined but never used`. Único erro que quebra `npm run lint` hoje. Ver achado A7 — a causa raiz não é remover o import, é religar o componente.

### [BOM] `scripts/*.mjs` documentados
`scripts/i18n-check.mjs` e `scripts/i18n-fill.mjs` têm comentários de cabeçalho e são chamados por `package.json`. `scripts/backfill-recebimentos-legado.mjs` existe, nomeado de forma autoexplicativa (não auditado em detalhe, fora do escopo desta seção).
