import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Auto dark mode based on system preference
const applyTheme = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', prefersDark);
};
applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Service Worker do PWA — apenas em produção. Em desenvolvimento ele
// cacheia chunks antigos do Vite (código novo misturado com antigo) e
// quebra o React na inicialização com "Cannot read properties of null
// (reading 'useState')". No dev, desregistramos workers antigos e
// limpamos os caches deixados por versões anteriores.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))))
        .catch(() => {});
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}