import React from "react";
import StatusBadge from "@/components/shared/StatusBadge";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

export default function DashboardClients({ clients }) {
  const { t } = useLanguage();
  const recent = clients.slice(0, 6);

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-foreground">{t("dash_recent_clients")}</h3>
        <Link to="/clientes" className="text-xs text-primary hover:text-primary/80 font-mono uppercase tracking-wider">
          {t("dash_view_all")}
        </Link>
      </div>
      <div className="space-y-3">
        {recent.map((client) => (
          <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">{client.nome?.[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{client.nome}</p>
                {client.email && <p className="text-[11px] text-muted-foreground truncate">{client.email}</p>}
              </div>
            </div>
            {client.tipo && <StatusBadge status={client.tipo} />}
          </div>
        ))}
        {recent.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t("dash_no_clients")}</p>
        )}
      </div>
    </div>
  );
}