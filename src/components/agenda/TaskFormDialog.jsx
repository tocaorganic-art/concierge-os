import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import AISuggestTime from "./AISuggestTime";

const defaultForm = {
  titulo: "", descricao: "", horario: "", data: "",
  tipo: "chamada", client_id: "", client_nome: "",
  prioridade: "media", lembrete_antecedencia: "", lembrete_ativo: false,
};

function buildGoogleCalendarUrl(task) {
  if (!task.data) return null;
  const [h, m] = (task.horario || "09:00").split(":").map(Number);
  const start = new Date(task.data);
  start.setHours(h, m, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.titulo || "Tarefa",
    dates: `${fmt(start)}/${fmt(end)}`,
    details: task.descricao || "",
    location: task.client_nome || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function TaskFormDialog({ open, onOpenChange, defaultDate, task }) {
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  const { data: tasksToday = [] } = useQuery({
    queryKey: ["tasks-today-form"],
    queryFn: () => base44.entities.Task.filter({ data: form.data || defaultDate }, "horario", 50),
    enabled: !!(form.data || defaultDate),
  });

  useEffect(() => {
    if (task) {
      setForm({
        titulo: task.titulo || "",
        descricao: task.descricao || "",
        horario: task.horario || "",
        data: task.data || "",
        tipo: task.tipo || "chamada",
        client_id: task.client_id || "",
        client_nome: task.client_nome || "",
        prioridade: task.prioridade || "media",
        lembrete_antecedencia: task.lembrete_antecedencia || "",
        lembrete_ativo: task.lembrete_ativo || false,
      });
    } else {
      setForm({ ...defaultForm, data: defaultDate || "" });
    }
  }, [task, open, defaultDate]);

  const mutation = useMutation({
    mutationFn: (data) =>
      task ? base44.entities.Task.update(task.id, data) : base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
      onOpenChange(false);
    },
  });

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({ ...f, client_id: clientId, client_nome: client?.nome || "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      lembrete_ativo: !!(form.horario && form.lembrete_antecedencia),
    });
  };

  const gcalUrl = buildGoogleCalendarUrl(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {task ? "Editar Tarefa" : "Nova Tarefa"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Título</Label>
            <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className="mt-1.5 bg-secondary border-border" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Horário</Label>
                <AISuggestTime tasksToday={tasksToday} onSuggest={(t) => setForm((f) => ({ ...f, horario: t }))} />
              </div>
              <Input type="time" value={form.horario} onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chamada">Chamada</SelectItem>
                  <SelectItem value="visita">Visita</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="operacao">Operação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm((f) => ({ ...f, prioridade: v }))}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Lembrar com antecedência</Label>
            <Select value={form.lembrete_antecedencia || "none"} onValueChange={(v) => setForm((f) => ({ ...f, lembrete_antecedencia: v === "none" ? "" : v }))}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Sem lembrete" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem lembrete</SelectItem>
                <SelectItem value="15min">15 minutos antes</SelectItem>
                <SelectItem value="30min">30 minutos antes</SelectItem>
                <SelectItem value="1h">1 hora antes</SelectItem>
                <SelectItem value="1dia">1 dia antes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Cliente Vinculado</Label>
            <Select value={form.client_id} onValueChange={handleClientChange}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className="mt-1.5 bg-secondary border-border" rows={2} />
          </div>

          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pb-6 pt-4 mt-2 bg-card border-t border-border flex items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-2">
              {gcalUrl && form.titulo && (
                <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2">
                    <ExternalLink className="w-3.5 h-3.5" /> Google Cal
                  </Button>
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={mutation.isPending}>
                {task ? "Salvar" : "Criar Tarefa"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}