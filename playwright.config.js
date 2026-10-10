import { defineConfig } from '@playwright/test';

// Suíte de testes do site institucional estático (public/institucional/index.html)
// e das rotas React que o servem (src/pages/InstitucionalSection.jsx). Roda
// contra o build de produção (vite build + vite preview), não o dev server,
// pra testar exatamente o que vai pro ar.
//
// Ambiente novo (clone limpo, CI real): rode `npx playwright install chromium`
// uma vez antes de `npm test` — o Chromium do Playwright não vem com o pacote.
// Este projeto não fixa o navegador a um caminho específico; em ambientes que
// já definem PLAYWRIGHT_BROWSERS_PATH (como o sandbox usado para validar esta
// suíte), o Playwright resolve o Chromium a partir dessa variável sozinho.
export default defineConfig({
  testDir: './tests/institucional',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 } },
    },
  ],
});
