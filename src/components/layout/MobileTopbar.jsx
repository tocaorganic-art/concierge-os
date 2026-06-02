import React from "react";
import { useLocation } from "react-router-dom";
import { Menu, Crown } from "lucide-react";

const routeTitles = {
  "/": "Visão Geral",
  "/pipeline": "Pipeline",
  "/clientes": "Clientes",
  "/agenda": "Agenda",
  "/propostas": "Propostas",
  "/relatorios": "Relatórios",
  "/faturamento": "Faturamento",
};

export default function MobileTopbar({ onMenuOpen }) {
  const location = useLocation();
  const title = routeTitles[location.pathname] || "Concierge OS";

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border md:hidden">
      <button
        onClick={onMenuOpen}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="font-display text-base font-semibold text-foreground">{title}</h1>
      <div className="w-9 h-9 flex items-center justify-center">
        <Crown className="w-4 h-4 text-primary" />
      </div>
    </div>
  );
}