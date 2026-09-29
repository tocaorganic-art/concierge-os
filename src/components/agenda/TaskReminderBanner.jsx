import React, { useMemo } from "react";
import { Bell } from "lucide-react";
import { format } from "date-fns";

function getMinutesUntilTask(task) {
  if (!task.data || !task.horario) return null;
  const now = new Date();
  const [h, m] = task.horario.split(":").map(Number);
  const taskTime = new Date(task.data);
  taskTime.setHours(h, m, 0, 0);
  return (taskTime.getTime() - now.getTime()) / 60000;
}

export default function TaskReminderBanner({ tasks }) {
  const urgentTasks = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return tasks
      .filter((t) => t.status !== "concluido" && t.data === today && t.horario)
      .map((t) => ({ ...t, minutesLeft: getMinutesUntilTask(t) }))
      .filter((t) => t.minutesLeft !== null && t.minutesLeft >= 0 && t.minutesLeft <= 30)
      .sort((a, b) => a.minutesLeft - b.minutesLeft);
  }, [tasks]);

  if (urgentTasks.length === 0) return null;

  const task = urgentTasks[0];
  const mins = Math.round(task.minutesLeft);

  return (
    <div className="animate-pulse bg-amber-500/15 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
      <Bell className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-amber-300">
          {mins === 0 ? "Agora!" : `Em ${mins} min`}
        </span>
        <span className="text-sm text-amber-200/80 ml-2 truncate">{task.titulo}</span>
        {task.client_nome && <span className="text-xs text-amber-200/60 ml-2">— {task.client_nome}</span>}
      </div>
      <span className="font-mono text-xs text-amber-400 flex-shrink-0">{task.horario}</span>
    </div>
  );
}