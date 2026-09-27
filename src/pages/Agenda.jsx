import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Circle, ChevronLeft, ChevronRight, CalendarDays, MessageCircle, ExternalLink, ClipboardCopy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import TaskFormDialog from "@/components/agenda/TaskFormDialog";
import TaskReminderBanner from "@/components/agenda/TaskReminderBanner";
import WhatsAppModal from "@/components/whatsapp/WhatsAppModal";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useLanguage } from "@/lib/i18n";
import { useUserProfile } from "@/lib/useUserProfile";

function buildGCalUrl(task) {
  if (!task.data) return null;
  const [h, m] = (task.horario || "09:00").split(":").map(Number);
  const start = new Date(task.data);
  start.setHours(h, m, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({ action: "TEMPLATE", text: task.titulo, dates: `${fmt(start)}/${fmt(end)}`, details: task.descricao || "" });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function Agenda() {
  const { t, lang } = useLanguage();
  const { isClient } = useUserProfile();
  const dateLocale = lang === "en" ? enUS : lang === "es" ? es : ptBR;
  const [view, setView] = useState("dia");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [whatsappTask, setWhatsappTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, isError } = useQuery({
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
  const navigateWeek = (dir) => setCurrentDate((d) => addDays(d, dir * 7));
  const navigateDay = (dir) => setCurrentDate((d) => addDays(d, dir));

  const getTasksForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks
      .filter((tk) => tk.data === dateStr)
      .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));
  };

  const handleNewTask = () => {
    setSelectedDate(format(currentDate, "yyyy-MM-dd"));
    setShowForm(true);
  };

  const TaskCard = ({ task }) => {
    const gcalUrl = buildGCalUrl(task);
    const [copied, setCopied] = useState(false);
    const handleCopyMensagem = async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(task.mensagem_rascunho);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard indisponível — ignora silenciosamente
      }
    };
    return (
      <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all gold-border-hover ${
        task.status === "concluido" ? "opacity-50 bg-card/50" : "bg-card border-border"
      }`}>
        <button onClick={() => !isClient && toggleTask.mutate(task)} disabled={isClient} className={`mt-0.5 flex-shrink-0 ${isClient ? "cursor-default" : ""}`}>
          {task.status === "concluido" ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-sm font-medium leading-tight ${task.status === "concluido" ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.titulo}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {task.horario && (
                <span className="font-mono text-xs font-bold text-primary">{task.horario}</span>
              )}
              {gcalUrl && (
                <a href={gcalUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors" title="Exportar para Google Calendar">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {task.tipo === "chamada" && task.client_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setWhatsappTask(task); }}
                  className="w-6 h-6 flex items-center justify-center rounded text-green-400 hover:bg-green-500/10 transition-colors"
                  title="Iniciar WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {task.tipo && <StatusBadge status={task.tipo} />}
            {task.prioridade && task.prioridade !== "media" && <StatusBadge status={task.prioridade} />}
            {task.lembrete_antecedencia && (
              <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">🔔 {task.lembrete_antecedencia}</span>
            )}
            {task.client_nome && <span className="text-[11px] text-muted-foreground">• {task.client_nome}</span>}
          </div>
          {task.mensagem_rascunho && (
            <div className="mt-2 p-2.5 rounded-lg bg-secondary/50 border border-border/60">
              <p className="text-[11px] text-muted-foreground whitespace-pre-line line-clamp-3">{task.mensagem_rascunho}</p>
              <button
                type="button"
                onClick={handleCopyMensagem}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
                {copied ? "Copiado!" : "Copiar mensagem"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground text-sm">Erro ao carregar tarefas.</p>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("nav_schedule")}
        subtitle={format(currentDate, "MMMM yyyy", { locale: dateLocale })}
        action={
          !isClient && (
            <Button onClick={handleNewTask} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" /> {t("btn_new_task")}
            </Button>
          )
        }
      />

      <TaskReminderBanner tasks={tasks} />

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
        <div className="hidden md:block">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="bg-secondary">
              <TabsTrigger value="semana">{t("view_week")}</TabsTrigger>
              <TabsTrigger value="dia">{t("view_day")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="md:hidden flex-1">
          <p className="font-display text-base font-semibold text-foreground capitalize">
            {format(currentDate, "EEEE, d 'de' MMMM", { locale: dateLocale })}
          </p>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => (view === "semana" && window.innerWidth >= 768 ? navigateWeek(-1) : navigateDay(-1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="font-mono text-xs h-8 px-2">
            {t("btn_today")}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => (view === "semana" && window.innerWidth >= 768 ? navigateWeek(1) : navigateDay(1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="space-y-3">
          {getTasksForDate(currentDate).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <CalendarDays className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("no_tasks_day")}</p>
              <Button variant="outline" size="sm" onClick={handleNewTask}>
                <Plus className="w-4 h-4 mr-1" /> {t("btn_add_task")}
              </Button>
            </div>
          ) : (
            getTasksForDate(currentDate).map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        {view === "semana" ? (
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const dayTasks = getTasksForDate(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="min-h-[300px]">
                  <div className={`text-center mb-3 pb-2 border-b ${isToday ? "border-primary" : "border-border"}`}>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {format(day, "EEE", { locale: dateLocale })}
                    </p>
                    <p className={`font-display text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {dayTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <p className="font-display text-2xl font-bold text-foreground capitalize">
                {format(currentDate, "EEEE, d 'de' MMMM", { locale: dateLocale })}
              </p>
            </div>
            <div className="max-w-2xl mx-auto space-y-3">
              {getTasksForDate(currentDate).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <CalendarDays className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{t("no_tasks_day")}</p>
                  <Button variant="outline" size="sm" onClick={handleNewTask}>
                    <Plus className="w-4 h-4 mr-1" /> {t("btn_add_task")}
                  </Button>
                </div>
              ) : (
                getTasksForDate(currentDate).map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        )}
      </div>

      {!isClient && (
        <button
          onClick={handleNewTask}
          className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
          aria-label={t("btn_new_task")}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <TaskFormDialog open={showForm} onOpenChange={setShowForm} defaultDate={selectedDate} />

      {whatsappTask && (
        <WhatsAppModal
          open={!!whatsappTask}
          onOpenChange={(v) => { if (!v) setWhatsappTask(null); }}
          client_nome={whatsappTask.client_nome}
          telefone=""
          context={`Olá ${whatsappTask.client_nome}, tudo bem? Estou ligando para ${whatsappTask.titulo}`}
        />
      )}
    </div>
  );
}