import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, KanbanSquare, Users, CalendarDays } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const PRIMARY_TABS = [
  { key: "nav_overview",  icon: LayoutDashboard, path: "/" },
  { key: "nav_pipeline",  icon: KanbanSquare,    path: "/pipeline" },
  { key: "nav_clients",   icon: Users,           path: "/clientes" },
  { key: "nav_schedule",  icon: CalendarDays,    path: "/agenda" },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-sidebar border-t border-sidebar-border flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {PRIMARY_TABS.map(({ key, icon: Icon, path }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors min-h-[56px] ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-[10px] font-medium leading-none">{t(key)}</span>
            {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" style={{ position: "relative", width: "24px", borderRadius: "2px" }} />}
          </Link>
        );
      })}
    </nav>
  );
}