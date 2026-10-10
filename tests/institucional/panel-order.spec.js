import { test, expect } from '@playwright/test';
import { PAGE_IDS, PAGE_NAMES, openStandalone } from './helpers.js';

// Ordem dos 8 painéis e troca de painel (goTo). Cobre o requisito "ordem dos
// oito painéis" e "mudança de painel" do pedido de testes.
//
// Testado no documento estático direto (não pela rota React/iframe): isso
// isola o mecanismo de troca de painel (goTo) de qualquer efeito colateral
// de roteamento — a navegação por rota de verdade (clique no menu, URL,
// voltar/avançar) é testada à parte em navigation-routes.spec.js.

test.describe('Ordem e identidade dos 8 painéis', () => {
  test('PAGES e PAGE_NAMES têm 8 itens, na ordem esperada', async ({ page }) => {
    await openStandalone(page);
    // PAGES/PAGE_NAMES são "const" no topo de um <script> clássico: existem
    // como identificador no escopo léxico do documento, mas NÃO viram
    // propriedade de window (diferente de "function", que vira). Por isso
    // acessamos o identificador solto, não window.PAGES.
    const pages = await page.evaluate(() => PAGES);
    const names = await page.evaluate(() => PAGE_NAMES);
    expect(pages).toEqual(PAGE_IDS);
    expect(names).toEqual(PAGE_NAMES);
  });

  test('só a primeira página (O que Fazemos) começa ativa', async ({ page }) => {
    await openStandalone(page);
    const activeIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.page.active')).map((el) => el.id)
    );
    expect(activeIds).toEqual(['pg-home']);
  });

  for (let i = 0; i < PAGE_IDS.length; i++) {
    test(`goTo(${i}) ativa exatamente "${PAGE_NAMES[i]}" (${PAGE_IDS[i]})`, async ({ page }) => {
      await openStandalone(page);
      await page.evaluate((idx) => goTo(idx), i);
      await page.waitForTimeout(450); // dura a transição animada (ver goTo/setTimeout 360ms)

      const activeIds = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.page.active')).map((el) => el.id)
      );
      expect(activeIds).toEqual([PAGE_IDS[i]]);

      const label = await page.evaluate(
        () => document.querySelector('.page.active .page-indicator span[id^="pg-label"]')?.textContent.trim()
      );
      const expectedLabel = `${String(i + 1).padStart(2, '0')} / 08`;
      expect(label).toBe(expectedLabel);
    });
  }

  test('indicador "page-dots" marca o ponto certo como ativo após goTo', async ({ page }) => {
    await openStandalone(page);
    await page.evaluate(() => goTo(3));
    await page.waitForTimeout(450);
    const activeDots = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.page-dots')).map((container) =>
        Array.from(container.children).findIndex((dot) => dot.classList.contains('active'))
      )
    );
    // Todo container de dots (um por página visível) deve concordar: o ponto 3 é o ativo.
    for (const idx of activeDots) expect(idx).toBe(3);
  });

  test('navegação sequencial pelas 8 páginas termina na última (FAQ) sem pular nenhuma', async ({ page }) => {
    await openStandalone(page);
    for (let i = 0; i < PAGE_IDS.length; i++) {
      await page.evaluate((idx) => goTo(idx), i);
      await page.waitForTimeout(420); // > 360ms do lock "animating" em goTo()
    }
    const active = await page.evaluate(() => document.querySelector('.page.active')?.id);
    expect(active).toBe('pg-faq');
  });

  test('goTo ignora chamadas durante a transição em andamento (trava "animating")', async ({ page }) => {
    await openStandalone(page);
    // Duas chamadas quase simultâneas: a segunda deve ser ignorada porque a
    // primeira ainda está "animating" (ver guarda no início de goTo()).
    await page.evaluate(() => { goTo(1); goTo(2); });
    await page.waitForTimeout(450);
    const active = await page.evaluate(() => document.querySelector('.page.active')?.id);
    expect(active).toBe('pg-curadoria');
  });
});
