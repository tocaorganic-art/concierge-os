import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, KanbanSquare, Users, CalendarDays } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import { CLIENT_NAV_ITEMS, CLIENT_BOTTOM_NAV_PATHS } from "@/lib/clientNav";

const PRIMARY_TABS = [
  { key: "nav_overview",  icon: LayoutDashboard, path: "/" },
  { key: "nav_pipeline",  icon: KanbanSquare,    path: "/pipeline" },
  { key: "nav_clients",   icon: Users,           path: "/clientes" },
  { key: "nav_schedule",  icon: CalendarDays,    path: "/agenda" },
];

// No mobile, o cliente só cabe 4 abas: Visão Geral | Financeiro | Agenda | Pedidos.
const CLIENT_PRIMARY_TABS = CLIENT_BOTTOM_NAV_PATHS
  .map((path) => CLIENT_NAV_ITEMS.find((item) => item.path === path))
  .filter(Boolean);

export default function MobileBottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  const { isClientMode } = useEffectiveRole();
  const tabs = isClientMode ? CLIENT_PRIMARY_TABS : PRIMARY_TABS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-sidebar border-t border-sidebar-border flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map(({ key, icon: Icon, path, labelFallback }) => {
        const isActive = location.pathname === path;
        const label = t(key) === key ? (labelFallback || key) : t(key);
        return (
          <Link
            key={path}
            to={path}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors min-h-[56px] ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
            {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" style={{ position: "relative", width: "24px", borderRadius: "2px" }} />}
          </Link>
        );
      })}
    </nav>
  );
}