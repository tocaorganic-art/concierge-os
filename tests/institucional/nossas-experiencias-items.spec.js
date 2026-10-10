import { test, expect } from '@playwright/test';
import { openRoute } from './helpers.js';

// "Nossas Experiências" é o resultado de duas fusões de conteúdo anteriores
// a este trabalho (ver comentários no próprio HTML e histórico de PRs
// #58/#61): a antiga página "Nossos Serviços" virou "Nossas Experiências",
// e a antiga página "Galeria" (guia de destinos) foi incorporada dentro
// dela. Este arquivo confirma que (a) o nome não regrediu para "Galeria"/
// "Serviços" em nenhum lugar visível, e (b) nenhum item do antigo conteúdo
// da Galeria foi perdido na fusão — comparando a contagem real de cards no
// DOM contra os números que a própria página anuncia nos filtros.

test.describe('Nossas Experiências — identidade e preservação de itens', () => {
  test('o rótulo da página é "Nossas Experiências", não "Galeria" nem "Serviços"', async ({ page }) => {
    const frame = await openRoute(page, '/Nossas-Experiencias');
    const eyebrow = await frame.evaluate(
      () => document.querySelector('#pg-servicos .h-eyebrow')?.textContent.trim()
    );
    expect(eyebrow).toMatch(/Nossas Experiências/);
    expect(eyebrow).not.toMatch(/Galeria/i);

    const menuLabel = await frame.evaluate(
      () => document.querySelector('.page-nav button[data-page="3"]')?.textContent.trim()
    );
    expect(menuLabel).toBe('Nossas Experiências');
  });

  test('nenhum elemento visível no documento ainda usa o rótulo "Galeria"', async ({ page }) => {
    const frame = await openRoute(page, '/Nossas-Experiencias');
    const textOccurrences = await frame.evaluate(() => {
      const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return SKIP_TAGS.has(node.parentElement?.tagName)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        },
      });
      const hits = [];
      while (walker.nextNode()) {
        if (/galeria/i.test(walker.currentNode.textContent)) {
          hits.push(walker.currentNode.textContent.trim());
        }
      }
      return hits;
    });
    expect(textOccurrences).toEqual([]);
  });

  test('as chaves de i18n órfãs da antiga "Galeria" (x.4, x.264, map.eyebrow, map.title) não estão em uso em nenhum elemento', async ({ page }) => {
    const frame = await openRoute(page, '/');
    const orphanKeysStillUsed = await frame.evaluate(() => {
      const used = new Set(
        Array.from(document.querySelectorAll('[data-i18n]')).map((el) => el.getAttribute('data-i18n'))
      );
      return ['x.4', 'x.264', 'map.eyebrow', 'map.title'].filter((k) => used.has(k));
    });
    // Achado da pré-inspeção: essas chaves existem nos dicionários pt/es/en
    // (texto remanescente da época da página "Galeria" separada), mas não
    // estão mais referenciadas por nenhum data-i18n no HTML atual — são
    // dados mortos, não um bug visível. Este teste reconfirma isso a cada
    // rodada; se algum dia um data-i18n="x.4" (ou as outras) reaparecer, o
    // teste falha e alguém precisa decidir se é intencional.
    expect(orphanKeysStillUsed).toEqual([]);
  });

  test('Imóveis para Temporada: contagem real bate com o que os filtros anunciam (7 = 6 RJ + 1 SC)', async ({ page }) => {
    const frame = await openRoute(page, '/Nossas-Experiencias');
    const counts = await frame.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#imoveisGrid .servico-card'));
      const byState = {};
      for (const c of cards) byState[c.dataset.state] = (byState[c.dataset.state] || 0) + 1;
      const declared = {};
      document.querySelectorAll('.state-filter-btn').forEach((btn) => {
        declared[btn.dataset.stateFilter] = Number(btn.querySelector('.count')?.textContent);
      });
      return { total: cards.length, byState, declared };
    });
    expect(counts.total).toBe(counts.declared.all);
    expect(counts.byState.RJ).toBe(counts.declared.RJ);
    expect(counts.byState.SC).toBe(counts.declared.SC);
  });

  test('Guia de Destinos: total de cards bate com o rótulo "Tudo" (154)', async ({ page }) => {
    const frame = await openRoute(page, '/Nossas-Experiencias');
    const result = await frame.evaluate(() => {
      const total = document.querySelectorAll('#destGrid .dest-card').length;
      const declaredTotal = Number(
        document.querySelector('.dest-cat-filter-btn[data-filter="all"] .count')?.textContent
      );
      return { total, declaredTotal };
    });
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBe(result.declaredTotal);
  });

  test('Guia de Destinos: contagem por categoria bate com o número anunciado em cada filtro', async ({ page }) => {
    const frame = await openRoute(page, '/Nossas-Experiencias');
    const { byCategory, declared } = await frame.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#destGrid .dest-card'));
      const byCategory = {};
      for (const c of cards) byCategory[c.dataset.cat] = (byCategory[c.dataset.cat] || 0) + 1;
      const declared = {};
      document.querySelectorAll('.dest-cat-filter-btn').forEach((btn) => {
        if (btn.dataset.filter !== 'all') declared[btn.dataset.filter] = Number(btn.querySelector('.count')?.textContent);
      });
      return { byCategory, declared };
    });
    for (const [cat, expected] of Object.entries(declared)) {
      expect(byCategory[cat], `categoria "${cat}"`).toBe(expected);
    }
    // soma das categorias == total geral (nenhum card sem categoria, nenhuma categoria duplicando)
    const sum = Object.values(byCategory).reduce((a, b) => a + b, 0);
    expect(sum).toBe(154);
  });

  test('Guia de Destinos: soma por cidade também bate com o total (nenhum item perdido/sem cidade)', async ({ page }) => {
    const frame = await openRoute(page, '/Nossas-Experiencias');
    const sum = await frame.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#destGrid .dest-card'));
      return cards.filter((c) => c.dataset.city && c.dataset.city.length > 0).length;
    });
    expect(sum).toBe(154);
  });

  test('filtro de categoria "Aeroportos" realmente filtra a lista visível (interação real, não só dado)', async ({ page }) => {
    const frame = await openRoute(page, '/Nossas-Experiencias');
    await frame.click('.dest-cat-filter-btn[data-filter="aeroporto"]');
    await page.waitForTimeout(200);
    const visibleCats = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('#destGrid .dest-card'))
        .filter((c) => c.offsetParent !== null)
        .map((c) => c.dataset.cat)
    );
    expect(visibleCats.length).toBe(14);
    expect(new Set(visibleCats)).toEqual(new Set(['aeroporto']));

    const pressed = await frame.evaluate(
      () => document.querySelector('.dest-cat-filter-btn[data-filter="aeroporto"]').getAttribute('aria-pressed')
    );
    expect(pressed).toBe('true');
  });

  test('filtro de cidade "Trancoso" realmente filtra a lista visível', async ({ page }) => {
    const frame = await openRoute(page, '/Nossas-Experiencias');
    await frame.click('.city-filter-btn[data-city="trancoso"]');
    await page.waitForTimeout(200);
    const visibleCities = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('#destGrid .dest-card'))
        .filter((c) => c.offsetParent !== null)
        .map((c) => c.dataset.city)
    );
    expect(visibleCities.length).toBeGreaterThan(0);
    expect(new Set(visibleCities)).toEqual(new Set(['trancoso']));
  });
});
