import React from "react";
import { base44 } from "@/api/base44Client";

// Raiz inteligente: visitante (não autenticado) vê o site institucional
// estático (public/institucional/index.html, com imagens relativas
// resolvendo em /institucional/images/); usuário já logado vai direto ao
// dashboard (o app autenticado vive em /dashboard).
export default function Institucional() {
  React.useEffect(() => {
    let ativo = true;
    base44.auth
      .isAuthenticated()
      .then((logado) => {
        if (!ativo) return;
        window.location.replace(logado ? "/dashboard" : "/institucional/index.html");
      })
      .catch(() => {
        if (ativo) window.location.replace("/institucional/index.html");
      });
    return () => { ativo = false; };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
    </div>
  );
}