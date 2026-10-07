# Seção D — i18n e Conteúdo

Repositório: `/home/user/concierge-os` (branch `audit/auditoria-completa-2026-10`). Auditoria somente leitura. `node scripts/i18n-check.mjs` foi executado de fato.

## 1. Institucional (`public/institucional/index.html`)

### [ALTO] D1 — Dicionário i18n ainda fala de "Trancoso" em vez de "em todo o Brasil", nas 3 línguas — regressão ativa ao trocar/recarregar idioma
- `index.html:3292,3294` (pt): `'hero.eyebrow':'Concierge personalizado · Trancoso, Bahia'` e `'hero.lede':'O Toca Concierge conecta hóspedes de alto padrão a experiências únicas em Trancoso. [...]'`
- Mesmo padrão em espanhol (`:3595,3597`) e inglês (`:3898,3900`).
- Contradiz o texto estático renderizado no HTML (linha 2007-2009): `data-i18n="hero.eyebrow"` = "Concierge personalizado · em todo o Brasil" e `data-i18n="hero.lede"` = "[...] onde você estiver. [...] em qualquer destino do Brasil." — o posicionamento nacional só aparece enquanto `setLang()` não roda.
- `setLang()` (3921-3932) roda automaticamente no load se já existir `localStorage['toca-lang']`, e sempre que o usuário clica em qualquer botão de idioma — inclusive "PT" já marcado `aria-pressed="true"` (linha 1960). Basta clicar em "PT" ou ser visitante recorrente para o hero voltar a anunciar "Trancoso, Bahia" — regressão de copy do rebrand nacional, nas 3 línguas.
- Mesmo padrão nos "pillars" (`pillar.1..4.title/desc/count`, 3308-3313 pt / 3611-3616 es / 3914-3918 en) — mas essas chaves não são usadas em nenhum `data-i18n` (ver D1-baixo).

**Correção mínima:** atualizar `hero.eyebrow`, `hero.lede` (e qualquer chave com "Trancoso"/"da região") nas 3 línguas para o texto nacional atual; remover as chaves `pillar.*` mortas.

### [BAIXO] D1b — 12 chaves do dicionário nunca usadas no HTML (código morto)
Comparando todos os `data-i18n="..."` com as chaves de `pt`/`es`/`en`: `pillar.1.title/desc/count`, `pillar.2.*`, `pillar.3.*`, `pillar.4.*` (12 chaves) existem no dicionário mas não aparecem em nenhum `data-i18n`. Nenhuma chave órfã no sentido inverso — todas as 319 chaves usadas no HTML existem nas 3 línguas, contagem idêntica.

### [MÉDIO] D3 — `<title>` e `<meta name="description">` nunca são atualizados ao trocar de idioma
`setLang()` (3921-3932) só troca `document.documentElement.lang`, `localStorage` e `innerHTML` dos elementos `data-i18n` — nunca toca `document.title` nem `<meta name="description">` (linhas 13, 22). Visitante que troca para ES/EN continua com título e description em português — prejudica SEO/compartilhamento em outros idiomas (ver também F1).

### [BOM] D1 — persistência, sincronização de `<html lang>` e acessibilidade corretas
`localStorage.setItem('toca-lang', lang)` e leitura no load funcionam; `document.documentElement.lang` atualizado a cada troca; os 3 botões de idioma têm `aria-pressed` sincronizado com estilo visual dedicado. Todas as 319 chaves usadas existem nas 3 línguas, sem faltantes.

## 2. Dashboard (`src/lib/i18n.jsx` + `i18nResources.js`)

### [ALTO] D4 — Strings em português hardcoded mesmo nas páginas "já migradas" para i18next
`eslint.config.js:62-92` define `i18next/no-literal-string` como **warn** (nunca quebra build) e só nos arquivos: `Dashboard.jsx`, `Billing.jsx`, `Reports.jsx`, `Solicitacoes.jsx`, `MeuGrupo.jsx`, `MeuContrato.jsx`, `Documentos.jsx`, `ClientProfile.jsx`, `Chat.jsx`, `TocaTrIA.jsx` + componentes de `client/`, `chat/`, `billing/`, `concierge/`, `shared/`. O resto do app está fora do escopo "por design" (comentário do próprio arquivo, 58-61).

Rodando `npx eslint .` (sem `--quiet`, diferente do script oficial `npm run lint`) apareceram **65 ocorrências** de `i18next/no-literal-string`, mesmo dentro das áreas "já migradas". Exemplos reais:
- `src/components/billing/BillingFormDialog.jsx:543`: `<Label ...>Natureza financeira</Label>`
- `src/components/billing/BillingFormDialog.jsx:552`: botão `Limpar divisão`
- (mais 63 ocorrências em outros arquivos do mesmo conjunto)

Como `npm run lint` usa `--quiet`, **nenhum** desses 65 avisos aparece no fluxo oficial — o gate de qualidade nunca vê o problema.

**Correção mínima:** trocar as 65 ocorrências por chaves `t(...)` existentes/novas; rodar `npm run lint` sem `--quiet` periodicamente.

### [BOM] D2 — `scripts/i18n-check.mjs` funciona e passa
Executado de fato: `node scripts/i18n-check.mjs` → `[i18n:check] OK — 543 chaves consistentes entre pt-BR, en, es.` Nenhuma chave faltando ou órfã entre os 3 idiomas do dashboard.

### [MÉDIO] D5 — Workaround não resolvido para bug de produção no i18next, documentado em 3 tentativas falhas
`src/lib/i18n.jsx:120-149`: a função `t()` tem "rede de segurança" porque, segundo comentário do autor, em produção `t()` às vezes devolve a própria chave em vez do texto traduzido (ex.: "menu inteiro com 'nav_overview' na tela"), **sem causa raiz identificada**, após 3 tentativas de correção (120-131). Contorno atual busca direto no dicionário fonte quando `t()` falha — funciona como paliativo, mas indica instabilidade real não resolvida que pode se manifestar de formas não cobertas (mesmo padrão duplicado em `translateCategoria`, 221-233).

### [BOM] D2 — Páginas de autenticação 100% em português, sem seletor de idioma
`Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`: nenhum uso de `useLanguage()`/`t(...)` — confirmando autenticação sempre em PT.

### [MÉDIO] D6 — `<html lang="en">` no index.html raiz (shell autenticado), mas interface é 100% em português
`index.html:2` (shell do SPA/dashboard): `<html lang="en">`. Inconsistente com a exigência de interface autenticada em português — o atributo fica incorreto até o React montar e `src/lib/i18n.jsx:100-102` sobrescrever via `useEffect` — por um instante, e para leitor de tela/crawler sem JS, a página se declara em inglês.
**Correção mínima:** trocar para `lang="pt-BR"` no HTML estático.

## 3. Emails

### [BOM] D3 — E-mail de boas-vindas bem construído
Não existe diretório `base44/emails/*.html` (templates inline em JS). `base44/functions/sendWelcomeEmail/entry.ts:30-120`: dicionário `COPY` com `pt-BR`/`es`/`en` completos e simétricos, todas as variáveis (`nome`, `email`, `destino`, `dataInicio/Fim`, `whatsapp`) interpoladas e escapadas (`escapeHtml`, 122-124) — sem risco de XSS. `APP_URL` (linha 10) aponta para `https://tocaconciergeos.base44.app` — domínio correto. `lang = client.idioma_padrao || inferLang(client.telefone) || 'pt-BR'` (199) respeita a regra pedida. Tema visual consistente (`PRIMARY_COLOR = '#F07A2E'`). Comentário (3-6) deixa explícito que o e-mail nunca deve conter valores/cobranças — confirmado, `COPY` não menciona dado financeiro.
