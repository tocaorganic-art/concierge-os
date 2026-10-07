# Causas Raiz — 3 Bugs Conhecidos

Para cada bug: cadeia de execução completa e patch mínimo proposto (descrito, não aplicado), conforme pedido no prompt de auditoria.

---

## 1. Loop de autenticação pós-login Google

**Status:** já diagnosticado e corrigido nesta branch. Documentado aqui pela cadeia de execução histórica (útil para referência futura) e pelo risco residual identificado.

### Cadeia de execução do bug original (reconstruída a partir dos comentários do próprio código)

1. Um link de convite trazia `?access_token=...` na URL (token do convite, não um token de sessão real).
2. `src/lib/app-params.js:9-35` (`getAppParamValue`) gravava esse valor em `localStorage` sob `base44_access_token` e removia da URL (`removeFromUrl: true`).
3. `src/lib/AuthContext.jsx:21-49` (`checkAppState`) usava esse token para checar `public-settings`; a plataforma recusava (`auth_required`/`user_not_registered`).
4. Sem limpar o token, o próximo carregamento repetia o fluxo, redirecionando para o login da plataforma, que devolvia o usuário ao app com o mesmo token inválido — loop infinito de reload. Comentário literal em `AuthContext.jsx:97-103`:
   > "SEM isto o app entra em loop: o token ruim fica no localStorage, me() falha, o AuthContext manda pro login da plataforma, que (...) devolve o usuário ao app — onde me() falha de novo — recarga atrás de recarga até o Chrome morrer com 'Não há memória suficiente'".
5. `public/sw.js` reforçava o problema: cada tentativa de login gerava URL diferente (`?access_token=...`) que o Service Worker cacheava, inchando o cache até o navegador ficar sem memória.

### Correção já aplicada nesta branch

- `AuthContext.jsx:104-111` (`limparTokenInvalido`) remove `base44_access_token`/`token` do `localStorage` assim que a checagem falha com 401/403 (linhas 58-60, 129-135).
- `public/sw.js` detecta `hasAuthParams` (`access_token`/`clear_access_token` na query) e nunca grava essas navegações no cache.
- `src/lib/authReturnTo.js` (`safeReturnTo`, 12-34) sanitiza `returnTo` contra open redirect **e** contra "poison" dos parâmetros de bootstrap (`access_token`, `app_base_url`, `functions_version`, `from_url` — removidos explicitamente, 25-27) antes de redirecionar — fecha vetor adicional de reintrodução de token/endpoint controlado pelo atacante.

### Risco residual específico para contas admin (não totalmente descartável por análise estática)

`src/lib/app-params.js:52-54` — `export const appParams = { ...getAppParams() }` é calculado **uma única vez**, no module load (import time), não reativamente. Se durante a mesma aba o token for invalidado (`limparTokenInvalido()`) mas nenhum reload completo ocorrer antes de uma chamada que dependa de `appParams.token` (ex.: `OAuthConsent.jsx:38`, usado para montar o header `Authorization`), a aba pode continuar enviando o token antigo em memória mesmo após `localStorage.removeItem` — porque `appParams.token` já foi capturado como constante no import e só é relido em um **novo** carregamento de página. Não reproduz o loop clássico (já mitigado), mas pode gerar estado inconsistente.

**Patch mínimo proposto (não aplicado):** tornar `appParams.token` reativo (reler de `localStorage` a cada uso em vez de capturar uma vez no import), ou forçar `window.location.reload()` dentro de `limparTokenInvalido()`.

**Requer teste em runtime:** reproduzir login Google com conta admin cujo token é invalidado em meio à sessão (ex.: revogar sessão no painel da plataforma com a aba do dashboard aberta) e verificar se a aba entra em estado inconsistente em vez de forçar reload.

---

## 2. Onboarding/Tutorial cobrindo o ProposalFormDialog no carregamento inicial

**Status:** reproduzido pela lógica (análise estática), causa raiz identificada com alta confiança.

### Cadeia de execução

1. `src/pages/Proposals.jsx:57-65` abre `ProposalFormDialog` automaticamente quando a URL chega com `?open=<id>` (deep link vindo de Pipeline/Dashboard) — `useEffect` depende só de `[proposals, isClient]`, sem esperar nada de onboarding.
2. `ProposalFormDialog` usa `Dialog` padrão (`src/components/ui/dialog.jsx:21,34`) com `z-50`.
3. Em paralelo, `src/components/layout/AppLayout.jsx:69-86` decide, assim que o perfil carrega (`isLoadingProfile` vira `false`), mostrar `OnboardingWizard` (`deveMostrarOnboardingOperador` em `src/lib/papel.js:34-36` — primeiro login de operador, `!isClient && user.first_login !== false`) ou `TutorialModal` (sem `localStorage['tutorial_seen_'+id]`).
4. `OnboardingWizard.jsx:47`: `fixed inset-0 z-[100] bg-background` — tela cheia opaca, muito acima do `z-50` do diálogo. `TutorialModal.jsx:337` é `z-[200]`, ainda mais alto.
5. Ambos montados de forma incondicional em `AppLayoutInner` (`AppLayout.jsx:152-174`), independente da rota — inclusive em `/propostas?open=xyz`.

### Resultado

Admin em primeiro acesso que chega via link direto a uma proposta (`/propostas?open=<id>`) vê `ProposalFormDialog` abrir *por baixo* do onboarding/tutorial em tela cheia — não aparece até o usuário terminar/pular o wizard; quando este fecha, a tela de proposta "pisca" aberta sem o usuário ter clicado em nada. Exatamente o bug relatado.

### Patch mínimo proposto (não aplicado)

Opção A: o efeito em `Proposals.jsx:58-65` deve aguardar a resolução do onboarding/tutorial — receber via contexto um `blockingOverlayOpen` (exposto por `AppLayout`) e só setar `showForm(true)` quando for `false`.
Opção B: `AppLayout` atrasa a decisão de abrir onboarding/tutorial até depois do primeiro paint das rotas com parâmetros de deep-link pendentes (checar `location.search` antes de montar `OnboardingWizard`/`TutorialModal`).

A opção A é preferível — não adia o onboarding para quem não tem deep link pendente, só coordena os dois overlays quando colidem.

---

## 3. Acesso do cliente ao próprio dashboard (quebra de navegação/dados em mobile)

**Status:** causa raiz identificada — múltiplos pontos contribuem para a sensação de "acesso quebrado", o mais concreto e reproduzível por lógica é a perda de navegação mobile (C2); um segundo ponto é a fragilidade arquitetural de isolamento de dados no Dashboard (C9).

### Cadeia de execução — perda de navegação mobile (achado C2, o mais correspondente ao sintoma relatado)

1. `src/components/layout/MobileTopbar.jsx:5` define `PRIMARY_ROUTES = ["/dashboard", "/pipeline", "/clientes", "/agenda"]` — lista pensada para o papel **admin** (inclui `pipeline`, `clientes`, rotas que o cliente nunca acessa).
2. `MobileTopbar.jsx:24,31-47`: se a rota atual não está em `PRIMARY_ROUTES`, a topbar mostra `ArrowLeft` (voltar) em vez de `Menu` (que abriria `MobileDrawer`).
3. `src/lib/clientNav.jsx:25` define `CLIENT_BOTTOM_NAV_PATHS` com `/dashboard, /faturamento, /agenda, /solicitacoes` — as 4 rotas que o cliente de fato navega pela bottom-nav.
4. Interseção: só `/dashboard` e `/agenda` estão em ambas as listas. Ao navegar para **Financeiro (`/faturamento`)** ou **Pedidos (`/solicitacoes`)** pela própria bottom-nav do cliente, `MobileTopbar` não reconhece a rota como "primária" e troca o botão para "voltar" — **o cliente perde o único jeito de abrir o `MobileDrawer`** naquelas telas, não conseguindo chegar em Meu Grupo, Meu Contrato, Documentos, Perfil, Chat, Toca TrIA ou Relatórios sem voltar para Visão Geral/Agenda primeiro.

**Patch mínimo proposto (não aplicado):** tornar `PRIMARY_ROUTES` dinâmico por papel — quando `isClientMode`, usar a união de `CLIENT_BOTTOM_NAV_PATHS` (ou `CLIENT_NAV_ITEMS`) em vez da lista fixa pensada para admin. Alternativa mais simples: sempre mostrar o ícone de menu (hambúrguer) e confiar no gesto nativo de "voltar" do navegador/SO em vez de um botão dedicado.

### Ponto arquitetural relacionado (achado C9)

`src/pages/Dashboard.jsx:227-250` chama `.list()` sem filtro para 5 entidades (`proposals`, `clients`, `tasks-today`, `billings-dashboard`, `recebimentos`) mesmo quando o usuário autenticado é uma conta cliente real (não só "ver como cliente"), filtrando só depois em JS por `effectiveClientId`. Não é a causa do sintoma relatado em mobile, mas é o tipo de fragilidade que, combinada com uma mudança futura de RLS, pode transformar um problema de UX em um vazamento de dado real entre clientes — por isso citado aqui como causa raiz **estrutural** adjacente ao mesmo bug de "acesso do cliente ao dashboard".

**Patch mínimo proposto (não aplicado):** adicionar `enabled: !isClientMode` nessas 5 queries (já é o padrão usado para `expenses`/`contasPagar` no mesmo arquivo, linhas 253-262) e buscar os dados já filtrados por `client_id` quando `isClientMode`, como feito em `MeuContrato.jsx:108-109`/`Documentos.jsx:38-39`.
