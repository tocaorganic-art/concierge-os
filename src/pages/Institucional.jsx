import React from "react";

// Raiz pública: SEMPRE o site institucional estático
// (public/institucional/index.html, com imagens relativas resolvendo em
// /institucional/images/), independente do visitante estar logado ou não.
//
// NAO reintroduzir um redirect condicional por estado de autenticacao aqui.
// Ja foi tentado (ver historico: commits "Redirecionar raiz para dashboard
// ou login..." em 2026-10-08) e causou o bug "a raiz as vezes abre o site,
// as vezes vai direto pro dashboard": como o check de auth e assincrono e
// depende da sessao do navegador, quem estava logado (ex.: o proprio Tony,
// testando) era jogado pro dashboard ao abrir tocaconcierge.com.br, nunca
// vendo o site. O acesso ao dashboard para quem ja e cliente acontece pelos
// links "Acessar o painel" dentro do proprio site estatico, que apontam
// direto para /dashboard (protegido por ProtectedRoute: sem sessao, cai em
// /login automaticamente).
export default function Institucional() {
  React.useEffect(() => {
    window.location.replace("/institucional/index.html");
  }, []);
  return null;
}