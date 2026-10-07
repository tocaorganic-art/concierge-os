# Seção F — SEO, Marketing e Legal

Repositório: `/home/user/concierge-os` (branch `audit/auditoria-completa-2026-10`). Auditoria somente leitura.

## [ALTO] F1 — Sem robots.txt, sem sitemap.xml, sem favicon, sem hreflang no site institucional
`find public -maxdepth 1 -type f` → apenas `sw.js` e `manifest.json`. Não existe `robots.txt` nem `sitemap.xml` em `public/` nem em `public/institucional/`.
`grep -n "hreflang" public/institucional/index.html` → nenhum resultado. A página tem 3 idiomas via JS (pt/es/en), mas nenhuma tag `<link rel="alternate" hreflang="...">` — buscadores não sabem que essas variantes existem.
`grep -n "rel=.icon" public/institucional/index.html` → nenhum resultado (sem favicon dedicado; o `index.html` raiz do dashboard usa ícone do Base44, não da marca Toca).
`<title>`/`<meta name="description">` (linhas 13, 22) existem e são bons, mas só em português e nunca atualizados ao trocar idioma (ver D3).
**Correção mínima:** adicionar `robots.txt`/`sitemap.xml`, favicon próprio, tags `hreflang` pt/es/en.

## [ALTO] F2 — Canonical inconsistente com a URL real de conteúdo
`public/institucional/index.html:20`: `<link rel="canonical" href="https://tocaconciergeos.com.br">` — mas o conteúdo real só é servido em `/institucional/index.html` (a home "/" apenas redireciona via JS, ver E9). O canonical deveria refletir onde o conteúdo vive, ou a home "/" deveria servir esse conteúdo diretamente sem redirect client-side.

## [ALTO] F3 — Meta Pixel: evento Purchase sem nenhum parâmetro; institucional sem pixel nenhum
Pixel base (init + PageView) está em `index.html:16-25` (shell do dashboard/SPA) — `fbq('init', '973466768729401')`. **Não existe nenhum código de Meta Pixel em `public/institucional/index.html`** (busca por `fbq(`, `connect.facebook.net`, `pixel` — zero ocorrências) — visitas à landing pública não geram nenhum evento de topo de funil (ViewContent, Lead), só a partir do momento em que o usuário entra no app autenticado.

`src/pages/Obrigado.jsx:9-14`:
```jsx
useEffect(() => {
  if (window.fbq) {
    window.fbq("track", "Purchase");
  }
}, []);
```
O evento `Purchase` dispara **sem nenhum parâmetro** — sem `value`, `currency`, nem plano. A tarefa pedia explicitamente "Purchase em /obrigado com parâmetros por plano" — não existe hoje. Também não há PII sendo enviada ao `fbq` (positivo), mas o evento fica praticamente inútil para otimização de campanhas (CPA/ROAS) sem `value`/`currency`.

**Correção mínima:** `window.fbq("track", "Purchase", { value: <valor_do_plano>, currency: "BRL", content_name: <plano> })`. Sem consentimento de cookies/LGPD explícito antes de carregar o pixel — ver F4.

## [CRÍTICO] F4 — Nenhuma política de privacidade, termos de uso ou checkbox de consentimento no cadastro
Busca em todo o repositório (`src/`, `public/`) por "política de privacidade", "termos de uso", "/privacidade", "/termos", "LGPD" — **zero resultados**, tanto no institucional quanto no app.
`src/pages/Register.jsx` — tela de cadastro — não tem checkbox de aceite de termos/privacidade (`grep -i "termo\|privacidade\|consent\|aceito\|concordo"` → vazio).
Lacuna legal real para um produto que processa dados sensíveis (documentos de identidade, CPF/passaporte, voos — ver F5): não há base legal documentada/linkada em lugar nenhum da jornada do usuário.

**Correção mínima:** criar páginas de Política de Privacidade e Termos de Uso, linkar no rodapé do institucional e no cadastro, com checkbox de aceite obrigatório no `Register.jsx`.

## [ALTO] F5 — LGPD: documentos e comprovantes de viagem sobem para storage público, não privado
O projeto já tem o padrão certo implementado em outro lugar: `src/components/chat/ChatAnexo.jsx:8,18` usa `base44.integrations.Core.UploadPrivateFile` + `CreateFileSignedUrl({ expires_in: 300 })` — comentário explicita: "duração (CreateFileSignedUrl) para abrir/baixar sem expor o arquivo." `src/components/client/ChatGeral.jsx:63` também usa `UploadPrivateFile`.

Porém, **todos os outros pontos de upload usam o método público `Core.UploadFile`**, gerando `file_url` permanente que não expira:
- `src/pages/MeuGrupo.jsx:67` — upload de **comprovante de voo** (bilhete/e-ticket com nome completo, número de voo, datas) para extração por IA (`ExtractDataFromUploadedFile`, 68-83). O arquivo sobe público, é usado uma vez e descartado pelo componente (nunca salvo em entidade) — fica armazenado publicamente e indefinidamente, sem que o app tenha como referenciá-lo ou apagá-lo.
- `src/components/expenses/ExpenseFormDialog.jsx:153`, `ClientBillingBlocks.jsx:53`, `BillingFormDialog.jsx:236`, `ImportarDocumentosDialog.jsx:63`, `ProposalFormDialog.jsx:363`, `useEventPhotos.js:32` — mesmo padrão para recibos financeiros, contratos e fotos de evento.
- `base44/entities/Hospede.jsonc:14-23` mostra RLS cuidadosa no campo `documento` (CPF/passaporte, leitura restrita a admin) — consciência do tema que não se estende ao **arquivo** do comprovante, só uma imagem/PDF solta em storage público sem controle de acesso nem expiração.

**Correção mínima:** trocar `Core.UploadFile` por `Core.UploadPrivateFile` + `CreateFileSignedUrl` nos fluxos com documentos/comprovantes pessoais (prioridade: `MeuGrupo.jsx`, depois billing/expenses que podem conter CPF/dados bancários em recibos); definir política de retenção/exclusão.

## O que está bom (evidência real)

1. i18n institucional: 319 chaves usadas no HTML, todas presentes nas 3 línguas, sem órfãs; `localStorage` + sincronização de `<html lang>` + `aria-pressed` implementados corretamente.
2. i18n dashboard: `node scripts/i18n-check.mjs` passa — 543 chaves consistentes entre pt-BR/en/es; script de CI próprio já existe e funciona.
3. Páginas de autenticação (`Login`, `Register`, `ForgotPassword`, `ResetPassword`) corretamente 100% em português, sem seletor de idioma.
4. E-mail de boas-vindas bem escrito: variáveis sempre interpoladas e escapadas (sem XSS), domínio correto, idioma decidido por `Client.idioma_padrao`, nenhum dado financeiro, tema consistente.
5. `jspdf`/`html2canvas` já code-splitted via import dinâmico — padrão correto, falta replicar para o resto do app.
6. Todos os 14 pontos de `setInterval`/`addEventListener` revisados têm cleanup correto.
7. RLS cuidadosa no campo `documento` de `Hospede`, restringindo leitura a admin — mostra consciência de LGPD a nível de dado, mesmo faltando aplicar a nível de arquivo (F5).
8. `ChatAnexo.jsx`/`ChatGeral.jsx` já usam upload privado + URL assinada com expiração — modelo a replicar.
9. `npx tsc -p ./jsconfig.json` passa sem nenhum erro.
10. `date-fns` usado de forma consistente para datas — sem duplicação ativa no bundle, mesmo com `moment` ainda instalada sem uso.
