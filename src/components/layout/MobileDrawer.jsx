import React, { useEffect } from "react";
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
  X,
  Star,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import LanguageSelector from "./LanguageSelector";

const navKeys = [
  { key: "nav_overview", icon: LayoutDashboard, path: "/" },
  { key: "nav_pipeline", icon: KanbanSquare, path: "/pipeline" },
  { key: "nav_clients", icon: Users, path: "/clientes" },
  { key: "nav_schedule", icon: CalendarDays, path: "/agenda" },
  { key: "nav_proposals", icon: FileText, path: "/propostas" },
  { key: "nav_reports", icon: BarChart3, path: "/relatorios" },
  { key: "nav_billing", icon: Receipt, path: "/faturamento" },
  { key: "nav_plans", icon: Star, path: "/planos" },
];

export default function MobileDrawer({ open, onClose }) {
  const location = useLocation();
  const { t } = useLanguage();

  // Close on route change
  useEffect(() => { onClose(); }, [location.pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">
                Concierge<span className="text-primary">OS</span>
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language selector */}
        <div className="border-b border-sidebar-border">
          <LanguageSelector />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navKeys.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span>{t(item.key)}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all w-full"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>{t("nav_signout")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}