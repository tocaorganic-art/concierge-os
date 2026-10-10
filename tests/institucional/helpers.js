// Helpers compartilhados pelos testes do site institucional.
//
// O site institucional (public/institucional/index.html) é um único
// documento estático com 8 "páginas" (divs .page) trocadas via goTo(idx) em
// JS puro — não é um app React. Desde a PR #64, cada página também tem uma
// rota real no React Router (/, /Curadoria, /Sobre, ...), que monta um
// iframe de tela cheia apontando pro mesmo documento estático com
// "?page=N". Testar o documento estático direto (via iframe) é o que
// permite inspecionar goTo(), PAGES, os contadores de itens etc.

export const PAGE_IDS = [
  'pg-home',
  'pg-curadoria',
  'pg-sobre',
  'pg-servicos',
  'pg-publico',
  'pg-proposta',
  'pg-reserva',
  'pg-faq',
];

export const PAGE_NAMES = [
  'O que Fazemos',
  'Curadoria',
  'Sobre',
  'Nossas Experiências',
  'Nosso Público',
  'Proposta',
  'Reservar',
  'FAQ',
];

export const ROUTES = [
  '/',
  '/Curadoria',
  '/Sobre',
  '/Nossas-Experiencias',
  '/Nosso-Publico',
  '/Proposta',
  '/Reservar',
  '/FAQ',
];

/**
 * Abre uma rota do app React (que monta o iframe institucional) e devolve o
 * Frame do iframe, já carregado.
 */
export async function openRoute(page, path) {
  await page.goto(path, { waitUntil: 'networkidle' });
  return getFrame(page);
}

/** Abre o documento estático direto (fora do iframe/React), como um bookmark antigo. */
export async function openStandalone(page, query = '') {
  await page.goto(`/institucional/index.html${query}`, { waitUntil: 'networkidle' });
  return page;
}

/**
 * Reobtém o Frame do iframe institucional atualmente montado.
 *
 * IMPORTANTE: cada rota (/, /Sobre, /Curadoria, ...) monta um
 * <InstitucionalSection> com `key={pageIndex}` — então qualquer navegação
 * que troque de rota (clique no menu, goTo() dentro do iframe chamando
 * window.parent.__institucionalNavigate, voltar/avançar do navegador) faz o
 * React desmontar o iframe antigo e montar um novo. Reusar um Frame handle
 * obtido antes dessa troca gera "Frame was detached". Sempre chame esta
 * função de novo depois de qualquer ação que possa ter mudado de rota.
 */
export async function getFrame(page) {
  const handle = await page.waitForSelector('iframe');
  const frame = await handle.contentFrame();
  await frame.waitForLoadState('networkidle');
  return frame;
}
