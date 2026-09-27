import React from "react";
import { Clock, CalendarDays } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

// "Próximos eventos" do cliente — diferente de DashboardAgenda (que só
// mostra tarefas de HOJE, pensado pro admin que abre o Dashboard todo dia).
// A viagem do cliente é uma data futura específica, então mostra os
// próximos eventos futuros (visivel_cliente=true via RLS), não só "hoje".
export default function DashboardProximosEventos({ tasks }) {
  const hojeStr = new Date().toISOString().split("T")[0];
  const proximos = tasks
    .filter((task) => task.data >= hojeStr)
    .sort((a, b) => (a.data + (a.horario || "")).localeCompare(b.data + (b.horario || "")))
    .slice(0, 6);

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Próximos eventos</h3>
      <div className="space-y-3">
        {proximos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento agendado ainda.</p>
        )}
        {proximos.map((task) => (
          <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/30">
            <div className="mt-0.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{task.titulo}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <CalendarDays className="w-3 h-3" />
                  {new Date(task.data + "T00:00:00").toLocaleDateString("pt-BR")}
                  {task.horario ? ` · ${task.horario}` : ""}
                </span>
                {task.tipo && <StatusBadge status={task.tipo} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
