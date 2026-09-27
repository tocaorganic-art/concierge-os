import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  CalendarDays,
  FileText,
  BarChart3,
  Receipt,
  Wallet,
  Crown,
  LogOut,
  Star,
  Settings,
  Lock,
  Sparkles,
  PlayCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import { CLIENT_NAV_ITEMS } from "@/lib/clientNav";
import LanguageSelector from "./LanguageSelector";

const navKeys = [
  { key: "nav_overview", icon: LayoutDashboard, path: "/" },
  { key: "nav_pipeline", icon: KanbanSquare, path: "/pipeline" },
  { key: "nav_clients", icon: Users, path: "/clientes" },
  { key: "nav_schedule", icon: CalendarDays, path: "/agenda" },
  { key: "nav_proposals", icon: FileText, path: "/propostas" },
  { key: "nav_reports", icon: BarChart3, path: "/relatorios", requiresPro: true },
  { key: "nav_billing", icon: Receipt, path: "/faturamento" },
  { key: "nav_expenses", icon: Wallet, path: "/despesas" },
  { key: "nav_plans", icon: Star, path: "/planos" },
  { key: "nav_settings", icon: Settings, path: "/configuracoes" },
];

export default function Sidebar({ onOpenTutorial }) {
  const location = useLocation();
  const { t } = useLanguage();
  const { hasProAccess } = usePlan();
  const { isClientMode } = useEffectiveRole();

  const { data: naoLidos = [] } = useQuery({
    queryKey: ["comentarios-nao-lidos"],
    queryFn: () => base44.entities.Comentario.filter({ autor_tipo: "cliente", lido: false }, "-created_date", 100),
    enabled: !isClientMode,
    refetchInterval: 30000,
  });

  if (isClientMode) {
    return (
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img
              src="https://media.base44.com/images/public/6a1f06cb2529a2c8784acc2c/64f555f0a_Toca_Icon_3D_Luxury_v2.png"
              alt="Toca OS"
              className="w-9 h-9 rounded-lg object-cover"
            />
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground tracking-tight">
                Toca <span className="text-primary">Concierge</span>
              </h1>
            </div>
          </div>
        </div>
        <div className="border-b border-sidebar-border">
          <LanguageSelector />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {CLIENT_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                <span className="flex-1">{t(item.key) === item.key ? item.labelFallback : t(item.key)}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all w-full"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>{t("nav_signout")}</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src="https://media.base44.com/images/public/6a1f06cb2529a2c8784acc2c/64f555f0a_Toca_Icon_3D_Luxury_v2.png"
            alt="Toca OS"
            className="w-9 h-9 rounded-lg object-cover"
          />
          <div>
            <h1 className="font-heading text-lg font-bold text-foreground tracking-tight">
              Toca <span className="text-primary">OS</span>
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Language selector */}
      <div className="border-b border-sidebar-border">
        <LanguageSelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navKeys.map((item) => {
          const isActive = location.pathname === item.path;
          const isLocked = item.requiresPro && !hasProAccess;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              }`} />
              <span className="flex-1">{t(item.key)}</span>
              {item.path === "/faturamento" && naoLidos.length > 0 && (
                <span className="text-[10px] font-mono font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{naoLidos.length}</span>
              )}
              {isLocked && <Lock className="w-3 h-3 text-muted-foreground/50" />}
              {isActive && !isLocked && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}

        {/* Solicitações + Toca TrIA */}
        <div className="pt-2 mt-2 border-t border-sidebar-border space-y-1">
          <Link
            to="/kpis"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === "/kpis"
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <span className="text-base">📊</span>
            <span className="flex-1">KPIs Concierge</span>
            {location.pathname === "/kpis" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </Link>
          <Link
            to="/parceiros"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === "/parceiros"
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <span className="text-base">🤝</span>
            <span className="flex-1">Parceiros</span>
            {location.pathname === "/parceiros" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </Link>
          <Link
            to="/meu-perfil"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === "/meu-perfil"
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <span className="text-base">✨</span>
            <span className="flex-1">Meu Perfil</span>
            {location.pathname === "/meu-perfil" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </Link>
          <Link
            to="/portal"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === "/portal"
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <Crown className={`w-[18px] h-[18px] transition-colors ${location.pathname === "/portal" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
            <span className="flex-1">Portal Cliente</span>
            {location.pathname === "/portal" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </Link>
          <Link
            to="/solicitacoes"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === "/solicitacoes"
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <span className="text-base">🏝️</span>
            <span className="flex-1">Solicitações</span>
            {location.pathname === "/solicitacoes" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </Link>
          <Link
            to="/toca-tria"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === "/toca-tria"
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <Sparkles className={`w-[18px] h-[18px] transition-colors ${
              location.pathname === "/toca-tria" ? "text-primary" : "text-primary/60 group-hover:text-primary"
            }`} />
            <span className="flex-1">Toca TrIA</span>
            <span className="text-[9px] font-mono font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">✦ IA</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={onOpenTutorial}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-sidebar-accent transition-all w-full group"
        >
          <PlayCircle className="w-[18px] h-[18px] group-hover:text-primary transition-colors" />
          <span>{t("nav_tutorial")}</span>
        </button>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all w-full"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>{t("nav_signout")}</span>
        </button>
      </div>
    </aside>
  );
}