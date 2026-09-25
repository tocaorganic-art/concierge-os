import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Crown, ArrowLeft } from "lucide-react";

const PRIMARY_ROUTES = ["/", "/pipeline", "/clientes", "/agenda"];

const routeTitles = {
  "/": "Visão Geral",
  "/pipeline": "Pipeline",
  "/clientes": "Clientes",
  "/agenda": "Agenda",
  "/propostas": "Propostas",
  "/relatorios": "Relatórios",
  "/faturamento": "Faturamento",
  "/toca-tria": "Toca TrIA",
  "/configuracoes": "Configurações",
  "/planos": "Planos",
};

export default function MobileTopbar({ onMenuOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const title = routeTitles[location.pathname] || "Toca TrIA";
  const isPrimary = PRIMARY_ROUTES.includes(location.pathname);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {isPrimary ? (
        <button
          onClick={onMenuOpen}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <h1 className="font-display text-base font-semibold text-foreground">{title}</h1>
      <img
        src="https://media.base44.com/images/public/6a1f06cb2529a2c8784acc2c/64f555f0a_Toca_Icon_3D_Luxury_v2.png"
        alt="Toca OS"
        className="w-7 h-7 rounded-md object-cover"
      />
    </div>
  );
}