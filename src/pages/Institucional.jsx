import React from "react";

// Página institucional estática (public/institucional/index.html) servida
// como página principal. O redirect real entrega o arquivo estático do
// site institucional, com as imagens relativas resolvendo em
// /institucional/images/. O dashboard (app autenticado) vive em /dashboard.
export default function Institucional() {
  React.useEffect(() => {
    window.location.replace("/institucional/index.html");
  }, []);
  return null;
}