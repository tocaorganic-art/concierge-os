import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import TaskFormDialog from "@/components/agenda/TaskFormDialog";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Agenda() {
  const [view, setView] = useState("semana");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-data", 200),
  });

  const toggleTask = useMutation({
    mutationFn: (task) =>
      base44.entities.Task.update(task.id, {
        status: task.status === "concluido" ? "pendente" : "concluido",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigateWeek = (dir) => {
    setCurrentDate((d) => addDays(d, dir * 7));
  };

  const navigateDay = (dir) => {
    setCurrentDate((d) => addDays(d, dir));
  };

  const getTasksForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks
      .filter((t) => t.data === dateStr)
      .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));
  };

  const TaskCard = ({ task }) => (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-lg border border-border transition-all gold-border-hover ${
        task.status === "concluido" ? "opacity-50" : "bg-card"
      }`}
    >
      <button onClick={() => toggleTask.mutate(task)} className="mt-0.5 flex-shrink-0">
        {task.status === "concluido" ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === "concluido" ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.titulo}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.horario && <span className="font-mono text-[11px] text-muted-foreground">{task.horario}</span>}
          {task.tipo && <StatusBadge status={task.tipo} />}
          {task.prioridade && task.prioridade !== "media" && <StatusBadge status={task.prioridade} />}
          {task.client_nome && <span className="text-[11px] text-muted-foreground">• {task.client_nome}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={format(currentDate, "MMMM yyyy", { locale: ptBR })}
        action={
          <Button onClick={() => { setSelectedDate(format(currentDate, "yyyy-MM-dd")); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Tarefa
          </Button>
        }
      />

      {/* View Toggle + Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="dia">Dia</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => (view === "semana" ? navigateWeek(-1) : navigateDay(-1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="font-mono text-xs">
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={() => (view === "semana" ? navigateWeek(1) : navigateDay(1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {view === "semana" ? (
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="min-h-[300px]">
                <div className={`text-center mb-3 pb-2 border-b ${isToday ? "border-primary" : "border-border"}`}>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={`font-display text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "d")}
                  </p>
                </div>
                <div className="space-y-2">
                  {dayTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="text-center mb-6">
            <p className="font-display text-2xl font-bold text-foreground">
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {getTasksForDate(currentDate).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma tarefa para este dia</p>
            )}
            {getTasksForDate(currentDate).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      <TaskFormDialog open={showForm} onOpenChange={setShowForm} defaultDate={selectedDate} />
    </div>
  );
}