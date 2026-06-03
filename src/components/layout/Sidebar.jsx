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
  Crown,
  LogOut,
  Star,
  Settings,
  Lock,
  Sparkles,
  PlayCircle,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import LanguageSelector from "./LanguageSelector";
import TutorialModal from "@/components/tutorial/TutorialModal";

const navKeys = [
  { key: "nav_overview", icon: LayoutDashboard, path: "/" },
  { key: "nav_pipeline", icon: KanbanSquare, path: "/pipeline" },
  { key: "nav_clients", icon: Users, path: "/clientes" },
  { key: "nav_schedule", icon: CalendarDays, path: "/agenda" },
  { key: "nav_proposals", icon: FileText, path: "/propostas" },
  { key: "nav_reports", icon: BarChart3, path: "/relatorios", requiresPro: true },
  { key: "nav_billing", icon: Receipt, path: "/faturamento" },
  { key: "nav_plans", icon: Star, path: "/planos" },
  { key: "nav_settings", icon: Settings, path: "/configuracoes" },
];

export default function Sidebar({ onOpenTutorial }) {
  const location = useLocation();
  const { t } = useLanguage();
  const { hasProAccess } = usePlan();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground tracking-tight">
              Toca Tr<span className="text-primary">IA</span>
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
              {isLocked && <Lock className="w-3 h-3 text-muted-foreground/50" />}
              {isActive && !isLocked && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}

        {/* Solicitações + Toca TrIA */}
        <div className="pt-2 mt-2 border-t border-sidebar-border space-y-1">
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