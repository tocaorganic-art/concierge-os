import React, { useState, useEffect } from "react";
import { Bell, X, Clock, Zap } from "lucide-react";
import { format } from "date-fns";

// Returns tasks that are due within `withinMinutes` from now, today, and not completed
function getUpcomingTasks(tasks, withinMinutes = 30) {
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();

  return tasks.filter((task) => {
    if (task.status === "concluido") return false;
    if (task.data !== today) return false;
    if (!task.horario) return false;

    const [h, m] = task.horario.split(":").map(Number);
    const taskTime = new Date();
    taskTime.setHours(h, m, 0, 0);

    const diffMs = taskTime - now;
    const diffMin = diffMs / 60000;

    // Show if within next `withinMinutes` minutes (and not more than 5 min past)
    return diffMin >= -5 && diffMin <= withinMinutes;
  });
}

export default function TaskNotifications({ tasks }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [tick, setTick] = useState(0);

  // Re-evaluate every minute
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = getUpcomingTasks(tasks).filter((t) => !dismissed.has(t.id));

  if (upcoming.length === 0) return null;

  const priorityColor = {
    alta: "border-red-500/40 bg-red-500/8",
    media: "border-amber-500/40 bg-amber-500/8",
    baixa: "border-border bg-card/60",
  };

  return (
    <div className="mb-5 space-y-2">
      {upcoming.map((task) => {
        const [h, m] = task.horario.split(":").map(Number);
        const taskTime = new Date();
        taskTime.setHours(h, m, 0, 0);
        const diffMin = Math.round((taskTime - new Date()) / 60000);
        const isNow = diffMin <= 0;
        const colorClass = priorityColor[task.prioridade] || priorityColor.baixa;

        return (
          <div
            key={task.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colorClass} animate-in slide-in-from-top-2 duration-300`}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isNow ? "bg-red-500/15" : "bg-amber-500/10"}`}>
              {isNow ? (
                <Bell className="w-4 h-4 text-red-400 animate-pulse" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${isNow ? "text-red-400" : "text-amber-400"}`}>
                  {isNow ? <><Zap className="w-3 h-3" /> Agora</> : `em ${diffMin} min`}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{task.horario}</span>
                {task.tipo && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {task.tipo}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground truncate mt-0.5">{task.titulo}</p>
              {task.client_nome && (
                <p className="text-xs text-muted-foreground truncate">• {task.client_nome}</p>
              )}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, task.id]))}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}