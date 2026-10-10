import { test, expect } from '@playwright/test';
import { openRoute } from './helpers.js';

// Formulários: a pré-inspeção (grep em todo o arquivo) não encontrou NENHUM
// elemento <form>, <input>, <textarea> ou <select> no site institucional —
// em nenhuma das 8 páginas, incluindo "Reservar" e "Proposta". A página
// "Reservar" tem um texto que SUGERE um formulário de contato ("Conte-nos
// sobre o seu grupo, datas e o que normalmente o faz feliz numa viagem"),
// mas a ação real ali é só um conjunto de links (WhatsApp, e-mail,
// Instagram, painel) — não existe captura de lead no próprio site.
//
// Este arquivo não testa "o formulário" porque não há formulário. Em vez
// disso, documenta e trava esse estado: confirma a ausência real de campos
// de formulário em todo o documento, e confirma que os links que SUBSTITUEM
// o formulário na prática (CTAs da página Reservar) são reais e funcionais,
// não placeholders quebrados (href="#" sem onclick, etc.).

test.describe('Formulários', () => {
  test('não existe nenhum <form>/<input>/<textarea>/<select> em nenhuma das 8 páginas', async ({ page }) => {
    const frame = await openRoute(page, '/');
    const counts = await frame.evaluate(() => ({
      form: document.querySelectorAll('form').length,
      input: document.querySelectorAll('input').length,
      textarea: document.querySelectorAll('textarea').length,
      select: document.querySelectorAll('select').length,
    }));
    // Achado a reportar a Tony: a cópia da página Reservar promete "conte-nos
    // sobre o seu grupo" mas não há nenhum campo on-site pra isso — só links
    // de saída (WhatsApp/e-mail/Instagram). Ver tests/institucional/forms.spec.js.
    expect(counts).toEqual({ form: 0, input: 0, textarea: 0, select: 0 });
  });

  test('a página Reservar, apesar de não ter formulário, tem 4 CTAs reais e funcionais (não placeholders)', async ({ page }) => {
    const frame = await openRoute(page, '/Reservar');
    const ctas = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('.reserva-actions a')).map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim(),
      }))
    );
    expect(ctas.length).toBe(4);
    for (const cta of ctas) {
      // Nenhum CTA deve ser um placeholder "#" sem destino real.
      expect(cta.href, `CTA "${cta.text}"`).not.toBe('#');
      expect(cta.href?.length ?? 0, `CTA "${cta.text}" sem href`).toBeGreaterThan(0);
    }
    const hrefs = ctas.map((c) => c.href);
    expect(hrefs).toContain('https://wa.me/5573998283579');
    expect(hrefs).toContain('mailto:contato@tocaexperience.com.br');
    expect(hrefs).toContain('https://instagram.com/tocaexperience');
    expect(hrefs).toContain('/dashboard');
  });

  test('o CTA do WhatsApp usa um número com formato válido (código do país + DDD + número)', async ({ page }) => {
    const frame = await openRoute(page, '/Reservar');
    const href = await frame.evaluate(
      () => document.querySelector('.reserva-actions a[href^="https://wa.me/"]')?.getAttribute('href')
    );
    expect(href).toMatch(/^https:\/\/wa\.me\/\d{12,13}$/);
  });
});
