import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";

// Painel de alertas de prazo: tarefas pendentes atrasadas/próximas e propostas
// com chegada da viagem se aproximando. Some sozinho quando não há nada urgente.
export default function DeadlineAlerts() {
  const { t } = useLanguage();

  const { data: alertas = [] } = useQuery({
    queryKey: ["deadline-alerts"],
    queryFn: async () => {
      const res = await base44.functions.invoke("checkDeadlineAlerts", { notify: false });
      return res?.data?.alertas || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (alertas.length === 0) return null;

  const prazoLabel = (a) => {
    if (a.dias < 0) return `${t("deadline_overdue")} (${-a.dias}d)`;
    if (a.dias === 0) return t("deadline_today");
    if (a.dias === 1) return t("deadline_tomorrow");
    return `${t("deadline_in")} ${a.dias} ${t("deadline_days")}`;
  };

  const prazoDate = (a) =>
    new Date(`${a.prazo}T12:00:00`).toLocaleDateString(t("locale_date"), {
      day: "2-digit",
      month: "short",
    });

  return (
    <div className="mb-4 md:mb-6 rounded-lg border border-warning/30 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-warning/5">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
        <span className="font-heading text-sm font-bold text-foreground">
          {t("deadline_alerts_title")}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {alertas.map((a) => (
          <li key={`${a.tipo}-${a.id}`}>
            <Link
              to={a.tipo === "tarefa" ? "/agenda" : "/propostas"}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors"
            >
              <CalendarClock
                className={`w-4 h-4 shrink-0 ${a.urgente ? "text-destructive" : "text-warning"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{a.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {(a.tipo === "tarefa" ? t("deadline_task") : t("deadline_arrival")) + " · " + prazoDate(a)}
                </p>
              </div>
              <span
                className={`text-xs font-mono uppercase shrink-0 px-2 py-0.5 rounded-full whitespace-nowrap ${
                  a.urgente
                    ? "bg-destructive/15 text-destructive"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {prazoLabel(a)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}