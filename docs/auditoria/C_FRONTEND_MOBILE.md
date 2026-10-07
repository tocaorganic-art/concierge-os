# Seção C — Frontend/UX (ênfase em Mobile)

Repositório: `/home/user/concierge-os` (branch `audit/auditoria-completa-2026-10`). Auditoria somente leitura. Ênfase extra em mobile por relato real do usuário ("a página está quebrada para versão mobile").

## 1. Rotas e navegação

**Mapa de rotas (`src/App.jsx:68-118`):**
- Públicas: `/`, `/oauth/consent`, `/obrigado`, `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Protegidas: `/dashboard`, `/pipeline`, `/clientes`, `/agenda`, `/propostas`, `/relatorios`, `/faturamento`, `/despesas`, `/configuracoes`, `/toca-tria`, `/solicitacoes`, `/parceiros`, `/kpis`, `/meu-grupo`, `/meu-contrato`, `/documentos`, `/meu-perfil`, `/chat`, `/connect`.
- Redirects: `/planos`→`/configuracoes`, `/portal`→`/dashboard`, `/portal/financeiro`→`/faturamento`, `/portal/pedidos`→`/solicitacoes`, `/home`/`/inicio`→`/dashboard` (todos comentados com a razão de negócio).
- `*` → `PageNotFound`.

### [ALTO] C6 — Link morto/confuso na Sidebar admin
`src/components/layout/Sidebar.jsx:236-247`: item "Portal Cliente" aponta para `/portal`, que é só redirect para `/dashboard`. O admin espera ver a visão do cliente e cai na própria Visão Geral — não ativa impersonation. Rótulo/ícone (`Crown`) prometem algo que a rota não entrega.
**Correção mínima:** apontar para o fluxo real de `startViewAs` a partir de `/clientes`, ou remover o item.

### [ALTO] C2 — Hambúrguer desaparece em várias páginas permitidas ao cliente (mobile)
`src/components/layout/MobileTopbar.jsx:5`:
```js
const PRIMARY_ROUTES = ["/dashboard", "/pipeline", "/clientes", "/agenda"];
```
Uso em `MobileTopbar.jsx:24,31-47`: se a rota não está em `PRIMARY_ROUTES`, a topbar mostra `ArrowLeft` em vez de `Menu` (abre `MobileDrawer`). Lista pensada para admin (`pipeline`, `clientes`), nunca atualizada para rotas do cliente. `CLIENT_BOTTOM_NAV_PATHS` (`src/lib/clientNav.jsx:25`) tem `/dashboard, /faturamento, /agenda, /solicitacoes` — mas só `/dashboard`/`/agenda` estão em `PRIMARY_ROUTES`. Navegando para **Financeiro** ou **Pedidos** pela própria bottom-nav, o botão vira "voltar" e **o cliente perde acesso ao menu-drawer** — não chega em Meu Grupo, Meu Contrato, Documentos, Perfil, Chat, Toca TrIA ou Relatórios sem voltar antes.
**Impacto:** mobile ≤767px, qualquer conta cliente. Navegação quebrada de fato — compatível com o relato do usuário.
**Correção mínima:** `PRIMARY_ROUTES` dinâmico por papel (combinar `CLIENT_NAV_ITEMS`/`CLIENT_BOTTOM_NAV_PATHS` quando `isClientMode`), ou sempre mostrar o hambúrguer.

**GlobalSearch** (`src/components/layout/GlobalSearch.jsx:31-53`) — bem segmentado por papel: admin busca `Client`/`Proposal` completos; cliente busca só `Billing`/`ServiceRequest` filtrados por `effectiveClientId`. Sem vazamento.

## 2. Bugs conhecidos

### [ALTO] C5 — Onboarding cobrindo ProposalFormDialog no carregamento inicial — reproduzido pela lógica

Cadeia de causas:
1. `src/pages/Proposals.jsx:57-65` abre `ProposalFormDialog` automaticamente quando a URL chega com `?open=<id>` — `useEffect` depende só de `[proposals, isClient]`, sem esperar onboarding.
2. `ProposalFormDialog` usa `Dialog` padrão (`src/components/ui/dialog.jsx:21,34`) com `z-50`.
3. `src/components/layout/AppLayout.jsx:69-86` decide, assim que o perfil carrega, mostrar `OnboardingWizard` (`deveMostrarOnboardingOperador` em `papel.js:34-36`) ou `TutorialModal`.
4. `OnboardingWizard` (`OnboardingWizard.jsx:47`): `fixed inset-0 z-[100] bg-background` — tela cheia opaca, acima do `z-50` do diálogo. `TutorialModal` é `z-[200]`, ainda mais alto.
5. Ambos montados incondicionalmente em `AppLayoutInner` (152-174), independente da rota.

**Resultado:** admin em primeiro acesso via link direto a proposta (`/propostas?open=<id>`) vê `ProposalFormDialog` abrir *por baixo* do onboarding/tutorial em tela cheia — não aparece até o wizard fechar, quando a tela de proposta "pisca" aberta sem o usuário ter clicado em nada.

**Correção mínima:** efeito em `Proposals.jsx:58-65` deveria aguardar resolução do onboarding/tutorial (contexto `blockingOverlayOpen`), ou `AppLayout` atrasar a decisão até depois do primeiro paint com deep-links pendentes.

### [MÉDIO] C8 — ClientTour e TutorialModal — flags inconsistentes entre dispositivos
- `TutorialModal`: flag `localStorage['tutorial_seen_' + user.id]` (`AppLayout.jsx:83,172`) — gravada só localmente. Em outro dispositivo/navegador ou após limpar dados do PWA, reaparece mesmo já visto.
- `ClientTour`: flag `onboarding_concluido` (`AppLayout.jsx:82`, via `base44.auth.updateMe` em `ClientTour.jsx:29-32`) — persistida no **backend**, consistente entre dispositivos. Correto.

**Correção mínima:** o tutorial do operador deveria seguir o mesmo padrão do `ClientTour` (persistir no perfil).

## 3. Telas cliente vs admin — vazamento de dado

`CLIENT_ALLOWED_PATHS` (`AppLayout.jsx:24-36`) bate com `CLIENT_NAV_ITEMS` (`clientNav.jsx:10-22`) — 11 rotas. Rota fora da whitelist exibe `SemAcesso` antes de montar `Outlet`; enquanto o perfil carrega, `Outlet` nem é renderizado (evita flash de conteúdo interno).

**RLS no backend cobre o que a UI assume:** `Client.jsonc`, `Billing.jsonc` (read por `client_id`/admin), `Proposal.jsonc` (campos internos com `rls.read.role:admin`).

### [MÉDIO] C9 — Dependência total do RLS de backend sem filtro equivalente no front, em queries "admin" chamadas também para contas cliente
`src/pages/Dashboard.jsx:227-250`: queries `["proposals"]`, `["clients"]`, `["tasks-today"]`, `["billings-dashboard"]` (`Billing.list(..., 500)`), `["recebimentos"]` (`Recebimento.list(..., 500)`) rodam **sem `enabled: !isClientMode`** — mesmo para conta cliente real, o front chama `.list()` sem filtro, filtrando depois em JS por `effectiveClientId` (291-295). Hoje não vaza porque o RLS do backend já restringe — mas é arquitetura frágil: se um RLS mudar nessas 5 entidades, o vazamento ocorre silenciosamente, sem defesa no front.
**Correção mínima:** usar `enabled: !isClientMode` (já feito para `expenses`/`contasPagar`, 253-262) e buscar dados já filtrados por `client_id` quando `isClientMode`, como em `MeuContrato.jsx:108-109`, `Documentos.jsx:38-39`.

**Cache do TanStack Query entre trocas de papel** — bem resolvido: toda query client-facing usa `effectiveClientId` na `queryKey` (`MeuContrato.jsx:108`, `MeuGrupo.jsx:155`, `Documentos.jsx:38,46,53`, `Billing.jsx:43`, `Dashboard.jsx:265`) — correto.

## 4. Estados de UI

### [MÉDIO] C10 — Páginas sem tratamento de erro de query
Só `src/pages/Agenda.jsx:43,186` trata `isError` explicitamente. `Dashboard.jsx`, `Billing.jsx`, `Solicitacoes.jsx` **não verificam** — se a API falhar, a tela renderiza listas vazias/KPIs zerados sem avisar erro. O estado de *loading* já foi corrigido (comentário em `Dashboard.jsx:270-277`), mas o de *erro* não.
**Correção mínima:** adicionar `isError` nas queries-chave e banner "Não foi possível carregar os dados".

**Bom:** `Agenda.jsx:186` tem estado de erro dedicado; spinners de loading consistentes em várias páginas.

## 5. Design system

**Tokens:** `src/index.css:8-67` define tokens HSL completos.

### [BAIXO] C12 — Hex hardcoded fora de casos justificados
`src/pages/Settings.jsx:341-342` e `ConciergeKPIs.jsx:22,86-90,93`: `#F07A2E` hardcoded em vez de `hsl(var(--primary))`. `GoogleIcon.jsx`/`MicrosoftIcon.jsx` têm hex mas são logos oficiais de terceiros — justificado.

**`.liquid-glass`** (`index.css:117-124`) — vidro translúcido com text-shadow laranja. Contraste WCAG AA não instrumentado (requer teste em runtime).

### [MÉDIO] C11 — prefers-reduced-motion não é aplicado de forma consistente
Sem regra `@media (prefers-reduced-motion: reduce)` global em `index.css`. Pontual:
- `DashboardBannerHeader.jsx:13-14` usa `matchMedia` para travar vídeo. ✅
- `DashboardStatusViagem.jsx:109,116` usa `useReducedMotion()`. ✅
- **Sem tratamento:** `TutorialModal.jsx` (`@keyframes float0/float1/float2`, `aiPulse`, `shimmerGlow`) e `OnboardingWizard.jsx:49-52` (`animate-pulse`).
- `public/institucional/index.html`: só 2 ocorrências de `prefers-reduced-motion` contra dezenas de `@keyframes`/`animation`.
**Correção mínima:** regra global de segurança em `index.css`, além dos tratamentos pontuais.

Não há uso de `framer-motion` no app nem biblioteca de confetti — confirmado por busca.

## 6. MOBILE/PWA — auditoria profunda (prioridade do usuário)

### [CRÍTICO] C1 — Sheet de perfil do cliente (admin) com largura fixa maior que a viewport mobile
`src/components/clients/ClientProfileSheet.jsx:73`:
```jsx
<SheetContent className="bg-card border-border w-[420px] overflow-y-auto">
```
Base (`sheet.jsx:35`): `side:"right"` = `w-3/4 ... sm:max-w-sm` (384px só a partir de 640px). Com `tailwind-merge`, `w-[420px]` sobrescreve `w-3/4`, mas `sm:max-w-sm` (variante diferente) permanece — **abaixo de 640px não existe limite de largura**: painel renderiza com 420px fixos. Qualquer celular < 420px (praticamente todos) tem o painel ultrapassando a tela, forçando overflow/clipping em `/clientes`.
**Correção mínima:** `w-full max-w-[420px] sm:w-[420px]`.

### [ALTO] C3 — Botão flutuante de chat sobrepõe o FAB "Nova Proposta" no Pipeline (mobile)
- `FloatingChat.jsx:60` (fechado): `fixed z-40 right-4 bottom-24 ... w-12 h-12` → horizontal 16-64px, vertical 96-144px.
- `Pipeline.jsx:250-256` FAB: `fixed bottom-20 right-6 z-30 md:hidden w-14 h-14` → horizontal 24-80px, vertical 80-136px.

As faixas se cruzam (24-64px horizontal, 96-136px vertical) — os dois botões se sobrepõem fisicamente, chat (`z-40`) fica **por cima** do FAB (`z-30`), tornando-o parcial ou totalmente inacessível.
**Correção mínima:** mover FAB do Pipeline para `bottom-24 right-20` ou coordenar um único "slot" de FAB.

### [MÉDIO] C7 — Regra global min-height/min-width:44px conflita com variantes menores do design system
`src/index.css:147-152`:
```css
button, a, [role="button"] {
  min-height: 44px;
  min-width: 44px;
}
```
Bom para acessibilidade de toque, mas `min-height` sempre vence sobre `height` menor. `button.jsx:23-26`: `size:sm → h-8` (32px) e `size:icon → h-9 w-9` (36px) **sempre renderizam a 44px**. Prova de conflito real já contornado: `CategoriasManager.jsx:140-141` usa `min-h-0 min-w-0` — mas não nos ~40 outros arquivos com botões de ícone pequenos (ex.: `MobileDrawer.jsx:61`, botão de fechar `w-8 h-8` renderizando a 44x44 dentro de cabeçalho compacto `p-5`).
**Impacto:** botões de ícone em grades/listas densas ficam ~12-16px maiores que o projetado — em viewport estreito (373-390px) empurra layout, aperta espaçamentos, sensação de "fora do lugar".
**Requer teste em runtime:** inspecionar botão de editar no `ClientProfileSheet` ou "X" do `MobileDrawer` em viewport 375×667, confirmar caixa computada.
**Correção mínima:** (a) remover `min-height/min-width` do seletor genérico e aplicar via classe `.tap-target` só onde necessário, ou (b) `min-h-0 min-w-0` nos componentes de ícone pequeno.

### [ALTO] C4 — Grids institucionais sem breakpoint mobile (landing pública, agora é a home "/")
`public/institucional/index.html`:
- `.pillars-grid` (586-591): `grid-template-columns: repeat(4, 1fr)`.
- `.services-grid` (723-728): `grid-template-columns: repeat(3, 1fr)`.

Nenhuma media query reduz colunas em telas estreitas (as existentes, 1100/900/768/720/640/560/480px, não tocam essas classes). Cada `.page` tem `overflow:hidden` — conteúdo que não cabe (373px/4 ≈ 93px por coluna) é **cortado/ilegível**. Como `/` agora é essa página (redirect em `App.jsx:73`), afeta a primeira impressão em mobile de qualquer visitante.
**Correção mínima:** `@media (max-width: 768px) { .pillars-grid { grid-template-columns: repeat(2,1fr); } .services-grid { grid-template-columns: 1fr; } }`.
**Requer teste em runtime:** abrir em 373×667/390×844, inspecionar páginas "Pilares"/"Proposta".

### 6.5 — manifest.json/sw.js/safe-areas
- [BAIXO, requer teste] **C13** — `manifest.json:14-33`: os 3 ícones apontam para o mesmo arquivo, sem variante com margem "maskable" — launchers Android podem cortar o logo.
- `sw.js`: estratégia bem pensada, dois bugs reais já corrigidos (comentários nas linhas 50-56, 70-81). Sem problema encontrado.
- Safe-areas: `MobileTopbar.jsx:29`, `MobileBottomNav.jsx:29`, `MobileDrawer.jsx:46` — todos com `env(safe-area-inset-*)`, `index.html:7` tem `viewport-fit=cover`. **Bom.**
- [BAIXO] **C14** — `index.html:7` tem `user-scalable=no, maximum-scale=1.0` — desabilita pinch-zoom, falha WCAG 1.4.4 para baixa visão. Não é a causa do relato mas vale registrar.
- [BAIXO, requer teste] **C15** — `PwaInstallPopup.jsx:69` (`fixed bottom-20 ... md:bottom-6`) não soma `env(safe-area-inset-bottom)` explicitamente; 80px costuma bastar, mas requer teste em iPhone com home-indicator grande.

### 6.6 — Alvos de toque, overflow horizontal, fontes
- Regra global 44px cobre a maioria (ver ressalva 6.3/C7).
- Sem `w-screen` combinado com padding (busca vazia).
- Sem outras larguras fixas além do caso C1 (`max-w-[260px]`/`max-w-[180px]` em `Despesas.jsx` são truncamento de texto, não contêiner).
- Tabelas: `Billing.jsx`, `Despesas.jsx`, `Clients.jsx`, `Plans.jsx` usam `<table>` — não confirmado visualmente se cada uma está em `overflow-x-auto` (só 2 arquivos usam a classe diretamente). **Requer teste em runtime:** `/faturamento` e `/despesas` em 375px.
- Fontes: app usa Tailwind responsivo; landing usa `clamp()` extensivamente — prática correta.
- `position:fixed` vs teclado virtual: não identificado caso de input fixo colado embaixo. **Requer teste em runtime:** chat flutuante em iOS Safari.

## 7. Formulários

- **Nenhum uso de `react-hook-form`/`zod`** nas telas reais, apesar de ambos no `package.json` — todos os formulários usam `useState` manual + validação ad hoc. Inconsistente entre telas, sem mensagens padronizadas em PT. Dívida técnica (Baixa/Média).
- **Double-submit:** `ProposalFormDialog.jsx:453-454` e `ClientFormDialog.jsx:126` protegidos (`disabled={mutation.isPending}` + spinner). Não auditado exaustivamente todos os ~15 diálogos.
- **Mensagens de erro em PT:** `toast({title:"Erro ao exportar", description: e?.message || "Tente novamente."})` — título em PT, descrição pode vir em inglês do SDK (requer teste em runtime).
- **Perda de dados ao fechar modal:** `ProposalFormDialog`/`ClientFormDialog` descartam tudo ao fechar, sem confirmação — padrão do projeto inteiro, melhoria não corretiva.

## O que está bom (evidenciado)

- Redirects de rotas legadas implementados e comentados com razão de negócio.
- RLS no backend restringe leitura por `client_id`/`role` de fato — sem vazamento real mesmo quando o front pede listas completas (ressalva C9).
- Cache do TanStack Query por `effectiveClientId` em todas as telas client-facing.
- `isImpersonating` desliga o chat flutuante (`FloatingChat.jsx:50`) — somente-leitura em "ver como cliente".
- Safe-areas tratadas corretamente em `MobileTopbar`, `MobileBottomNav`, `MobileDrawer`.
- `prefers-reduced-motion` já tratado em pontos críticos do Dashboard.
- Service worker bem desenhado, com dois bugs reais já corrigidos.
- Sequenciamento onboarding → tutorial coerente — problema é só a colisão com deep-link de proposta.
- Spinners de loading padronizados.

## Resumo priorizado para ação imediata no "quebrado no mobile"

1. **Crítico** — `ClientProfileSheet.jsx:73` `w-[420px]` sem limite responsivo.
2. **Alto** — `MobileTopbar.jsx:5` `PRIMARY_ROUTES` não cobre rotas do cliente.
3. **Alto** — `FloatingChat.jsx:60` + `Pipeline.jsx:250-256` — FABs sobrepostos.
4. **Alto** — `.pillars-grid`/`.services-grid` sem breakpoint mobile na home pública.
5. **Alto** — onboarding cobrindo `ProposalFormDialog` — causa raiz identificada.
6. **Médio** — conflito `min-height:44px` global vs. `size="sm"/"icon"` do Button.
