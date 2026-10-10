import { test, expect } from '@playwright/test';
import { PAGE_IDS, ROUTES, getFrame, openRoute } from './helpers.js';

// Navegação e destinos de links: cada item do menu tem rota real (PR #64),
// sobrevive a acesso direto/F5/voltar-avançar, e links internos/externos
// vão para o destino certo sem ficar presos dentro do iframe.

test.describe('Navegação por rota', () => {
  test('clique em cada item do menu muda a URL para a rota certa', async ({ page, baseURL }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    let frame = await getFrame(page);

    for (let i = 0; i < ROUTES.length; i++) {
      await frame.evaluate((idx) => goTo(idx), i);
      await page.waitForTimeout(450);
      const expectedUrl = new URL(ROUTES[i], baseURL).toString();
      await expect.poll(() => page.url()).toBe(expectedUrl);
      frame = await getFrame(page); // o iframe remonta a cada troca de rota
      const active = await frame.evaluate(() => document.querySelector('.page.active')?.id);
      expect(active).toBe(PAGE_IDS[i]);
    }
  });

  for (let i = 0; i < ROUTES.length; i++) {
    test(`acesso direto a "${ROUTES[i]}" abre a seção certa sem redirecionar`, async ({ page, baseURL }) => {
      const resp = await page.goto(ROUTES[i], { waitUntil: 'networkidle' });
      expect(resp.status()).toBe(200);
      const frame = await getFrame(page);
      const active = await frame.evaluate(() => document.querySelector('.page.active')?.id);
      expect(active).toBe(PAGE_IDS[i]);
      expect(page.url()).toBe(new URL(ROUTES[i], baseURL).toString());
    });
  }

  test('F5 (reload) em /Sobre mantém a URL e o conteúdo', async ({ page }) => {
    await page.goto('/Sobre', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    const frame = await getFrame(page);
    const active = await frame.evaluate(() => document.querySelector('.page.active')?.id);
    expect(active).toBe('pg-sobre');
    expect(page.url()).toContain('/Sobre');
  });

  test('voltar/avançar do navegador acompanha a navegação entre rotas', async ({ page, baseURL }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    let frame = await getFrame(page);
    await frame.evaluate(() => goTo(2)); // Sobre
    await page.waitForTimeout(450);
    frame = await getFrame(page);
    await frame.evaluate(() => goTo(5)); // Proposta
    await page.waitForTimeout(450);

    await page.goBack({ waitUntil: 'networkidle' });
    expect(page.url()).toBe(new URL('/Sobre', baseURL).toString());
    frame = await getFrame(page);
    expect(await frame.evaluate(() => document.querySelector('.page.active')?.id)).toBe('pg-sobre');

    await page.goBack({ waitUntil: 'networkidle' });
    expect(page.url()).toBe(new URL('/', baseURL).toString());

    await page.goForward({ waitUntil: 'networkidle' });
    expect(page.url()).toBe(new URL('/Sobre', baseURL).toString());
  });

  test('botão "próximo" do rodapé também atualiza a URL', async ({ page, baseURL }) => {
    await page.goto('/Curadoria', { waitUntil: 'networkidle' });
    const frame = await getFrame(page);
    // Escopado pela página ATIVA: ".footer-nav .nav-btn.primary" sozinho
    // casa com as 8 seções do documento inteiro (só uma está visível).
    await frame.click('#pg-curadoria .footer-nav .nav-btn.primary');
    await page.waitForTimeout(450);
    expect(page.url()).toBe(new URL('/Sobre', baseURL).toString());
  });

  test('seta do teclado navega e atualiza a URL', async ({ page, baseURL }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const frame = await getFrame(page);
    // Um clique real dentro do iframe é o que dá foco de verdade ao elemento
    // <iframe> no documento de fora — só document.body.focus() (dentro do
    // iframe) não basta pro page.keyboard.press() do topo alcançar o
    // keydown handler lá dentro.
    await frame.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(450);
    expect(page.url()).toBe(new URL('/Curadoria', baseURL).toString());
  });

  test('link "Acessar o painel" sai do iframe (não navega só por dentro dele)', async ({ page, baseURL }, testInfo) => {
    // O botão .theme-btn "Acessar o painel" do cabeçalho some no mobile
    // (display:none); lá quem faz esse papel é o link dentro do
    // menu-gaveta, que usa o mesmo target="_top" (ver os.3 links internos
    // para /dashboard têm target="_top" — cobre os dois).
    test.skip(testInfo.project.name === 'mobile', 'botão do cabeçalho some no mobile; equivalente é o link do drawer');
    await page.goto('/Sobre', { waitUntil: 'networkidle' });
    const frame = await getFrame(page);
    await frame.click('.theme-btn[aria-label="Acessar o painel"]');
    await page.waitForTimeout(500);
    // Sem sessão, ProtectedRoute redireciona /dashboard -> /login.
    expect(page.url()).toBe(new URL('/login', baseURL).toString());
    expect(await page.$('iframe')).toBeNull();
  });

  test('links externos (WhatsApp, Instagram, mapas) abrem com target="_blank" e rel="noopener"', async ({ page }) => {
    const frame = await openRoute(page, '/Reservar');
    const externalLinks = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('a[href^="http"]')).map((a) => ({
        href: a.getAttribute('href'),
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel'),
      }))
    );
    expect(externalLinks.length).toBeGreaterThan(0);
    for (const link of externalLinks) {
      expect(link.target, `link ${link.href} sem target="_blank"`).toBe('_blank');
      expect(link.rel || '', `link ${link.href} sem rel="noopener"`).toContain('noopener');
    }
  });

  test('os 3 links internos para /dashboard têm target="_top" (não ficam presos no iframe)', async ({ page }) => {
    const frame = await openRoute(page, '/');
    const dashboardLinks = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('a[href="/dashboard"]')).map((a) => a.getAttribute('target'))
    );
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    for (const target of dashboardLinks) expect(target).toBe('_top');
  });
});
