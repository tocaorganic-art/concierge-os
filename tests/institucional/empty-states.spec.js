import { test, expect } from '@playwright/test';
import { openRoute } from './helpers.js';

// Estados vazios/sem avaliação: o cartão de depoimentos da página Sobre não
// tem hóspedes reais ainda (ver comentário de auditoria no próprio HTML —
// 4 depoimentos fictícios foram removidos numa rodada anterior). Este
// arquivo confirma que o estado vazio continua honesto: não se disfarça de
// depoimento real, não tem nome de pessoa nem nota/estrelas inventadas.

test.describe('Estado vazio de depoimentos (página Sobre)', () => {
  test('existe exatamente 1 cartão placeholder, não depoimentos fictícios', async ({ page }) => {
    const frame = await openRoute(page, '/Sobre');
    const cardCount = await frame.evaluate(() => document.querySelectorAll('.depoimentos .dep-card').length);
    expect(cardCount).toBe(1);
  });

  test('o rótulo da seção diz claramente "Em breve", não apresenta como avaliação concluída', async ({ page }) => {
    const frame = await openRoute(page, '/Sobre');
    const label = await frame.evaluate(() => document.querySelector('.depoimentos .dep-label')?.textContent.trim());
    expect(label).toMatch(/em breve/i);
  });

  test('o cartão placeholder não atribui o texto a uma pessoa real nem inventa origem', async ({ page }) => {
    const frame = await openRoute(page, '/Sobre');
    const card = await frame.evaluate(() => {
      const el = document.querySelector('.depoimentos .dep-card');
      return {
        name: el.querySelector('.dep-name')?.textContent.trim(),
        origin: el.querySelector('.dep-origin')?.textContent.trim(),
        quote: el.querySelector('blockquote')?.textContent.trim(),
      };
    });
    // O nome exibido é a própria marca ("Toca Concierge"), não um nome de
    // hóspede fictício, e a "origem" diz explicitamente que o conteúdo está
    // pendente — nunca uma cidade/país inventados que simulem um hóspede real.
    expect(card.name).toBe('Toca Concierge');
    expect(card.origin.toLowerCase()).toContain('pendente');
    expect(card.quote.length).toBeGreaterThan(0);
  });

  test('nenhuma nota/estrelas (rating) é exibida junto do cartão placeholder', async ({ page }) => {
    const frame = await openRoute(page, '/Sobre');
    const hasRating = await frame.evaluate(() => {
      const card = document.querySelector('.depoimentos .dep-card');
      return /★|[0-9],[0-9]\s*\/\s*5|[0-9]\s*estrelas/i.test(card.textContent);
    });
    expect(hasRating).toBe(false);
  });

  test('o mesmo estado vazio honesto se repete em ES e EN (não vaza "Galeria"/depoimento fictício ao trocar idioma)', async ({ page }) => {
    const frame = await openRoute(page, '/Sobre');
    for (const lang of ['es', 'en']) {
      await frame.evaluate((l) => setLang(l), lang);
      await frame.locator('.depoimentos .dep-label').waitFor();
      const name = await frame.evaluate(() => document.querySelector('.dep-name')?.textContent.trim());
      expect(name).toBe('Toca Concierge');
    }
    // volta pro idioma padrão pra não vazar estado entre testes (localStorage é por worker/contexto, mas por clareza)
    await frame.evaluate(() => setLang('pt'));
  });
});
