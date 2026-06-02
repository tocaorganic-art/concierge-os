import React from "react";
import StatusBadge from "@/components/shared/StatusBadge";
import { Clock, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function DashboardAgenda({ tasks }) {
  const { t } = useLanguage();
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks
    .filter((task) => task.data === today)
    .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-display text-lg font-semibold text-foreground mb-4">{t("dash_todays_schedule")}</h3>
      <div className="space-y-3">
        {todayTasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t("dash_no_tasks")}</p>
        )}
        {todayTasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-lg border border-border transition-colors ${
              task.status === "concluido" ? "opacity-50" : "bg-secondary/30"
            }`}
          >
            <div className="mt-0.5">
              {task.status === "concluido" ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.status === "concluido" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.titulo}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {task.horario && <span className="font-mono text-[11px] text-muted-foreground">{task.horario}</span>}
                {task.tipo && <StatusBadge status={task.tipo} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}