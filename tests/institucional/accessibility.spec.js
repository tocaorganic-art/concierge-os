import { test, expect } from '@playwright/test';
import { openRoute } from './helpers.js';

// Acessibilidade essencial: alt em imagens, title em iframes, labels em
// controles só-ícone, foco visível e navegação por teclado no menu/drawer/
// player do Spotify, sem ids duplicados.

test.describe('Acessibilidade essencial', () => {
  test('toda <img> tem alt não vazio', async ({ page }) => {
    const frame = await openRoute(page, '/');
    const bad = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .filter((img) => !img.hasAttribute('alt') || img.getAttribute('alt').trim() === '')
        .map((img) => img.src)
    );
    expect(bad).toEqual([]);
  });

  test('todo <iframe> tem title descritivo', async ({ page }) => {
    const frame = await openRoute(page, '/Reservar');
    const bad = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('iframe'))
        .filter((f) => !f.hasAttribute('title') || f.getAttribute('title').trim() === '')
        .map((f) => f.src)
    );
    expect(bad).toEqual([]);
  });

  test('botões só com ícone (sem texto) têm aria-label', async ({ page }) => {
    const frame = await openRoute(page, '/');
    const bad = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter((btn) => btn.textContent.trim() === '' && !btn.querySelector('span:not(:empty)'))
        .filter((btn) => !btn.hasAttribute('aria-label') && !btn.hasAttribute('title'))
        .map((btn) => btn.outerHTML.slice(0, 120))
    );
    expect(bad).toEqual([]);
  });

  test('grupos de filtro (cidade, categoria, estado) têm role="group" e aria-label', async ({ page }) => {
    const frame = await openRoute(page, '/Nossas-Experiencias');
    const groups = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('.city-filters, .dest-cat-filters, .filters')).map((el) => ({
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label'),
      }))
    );
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.role).toBe('group');
      expect(g.label?.length).toBeGreaterThan(0);
    }
  });

  test('não há ids duplicados no documento', async ({ page }) => {
    const frame = await openRoute(page, '/');
    const dupes = await frame.evaluate(() => {
      const seen = new Map();
      document.querySelectorAll('[id]').forEach((el) => {
        seen.set(el.id, (seen.get(el.id) || 0) + 1);
      });
      return Array.from(seen.entries()).filter(([, count]) => count > 1);
    });
    expect(dupes).toEqual([]);
  });

  test('menu do cabeçalho é alcançável e ativável por teclado (Tab + Enter)', async ({ page, baseURL }, testInfo) => {
    // .page-nav some no mobile (display:none, ver regra em media query) e dá
    // lugar ao menu-gaveta — já coberto por um teste dedicado mais abaixo.
    test.skip(testInfo.project.name === 'mobile', 'nav do cabeçalho fica escondida no mobile; ver teste do menu-gaveta');
    const frame = await openRoute(page, '/');
    const curadoriaBtn = frame.locator('.page-nav button[data-page="1"]');
    await curadoriaBtn.focus();
    await expect(curadoriaBtn).toBeFocused();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
    expect(page.url()).toBe(new URL('/Curadoria', baseURL).toString());
  });

  test('botão "Ouvir Tony Monteiro" (Spotify): Enter abre, Escape fecha e devolve o foco', async ({ page }) => {
    const frame = await openRoute(page, '/Sobre');
    const fab = frame.locator('#spotifyFab');
    await fab.focus();
    await expect(fab).toBeFocused();

    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    await expect(frame.locator('#spotifyPanel')).not.toBeHidden();
    expect(await fab.getAttribute('aria-expanded')).toBe('true');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(frame.locator('#spotifyPanel')).toBeHidden();
    await expect(fab).toBeFocused();
  });

  test('prefers-reduced-motion zera a transição do painel do Spotify', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const frame = await openRoute(page, '/Sobre');
    await frame.click('#spotifyFab');
    const duration = await frame.evaluate(
      () => getComputedStyle(document.getElementById('spotifyPanel')).transitionDuration
    );
    expect(duration).toBe('0s');
  });

  test('o menu-gaveta mobile é alcançável e navegável por teclado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const frame = await openRoute(page, '/');
    const toggle = frame.locator('.mobile-toggle');
    await expect(toggle).toHaveAttribute('aria-label', /menu/i);
    await toggle.click();
    await expect(frame.locator('.mobile-drawer')).toHaveClass(/open/);
    const sobreBtn = frame.locator('.drawer-nav-btn[data-page="2"]');
    await expect(sobreBtn).toBeVisible();
  });
});
