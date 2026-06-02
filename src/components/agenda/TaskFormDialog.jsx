import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const defaultForm = {
  titulo: "",
  descricao: "",
  horario: "",
  data: "",
  tipo: "chamada",
  client_id: "",
  client_nome: "",
  prioridade: "media",
};

export default function TaskFormDialog({ open, onOpenChange, defaultDate, task }) {
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
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
      });
    } else {
      setForm({ ...defaultForm, data: defaultDate || "" });
    }
  }, [task, open, defaultDate]);

  const mutation = useMutation({
    mutationFn: (data) =>
      task
        ? base44.entities.Task.update(task.id, data)
        : base44.entities.Task.create(data),
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
    mutation.mutate(form);
  };

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
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Horário</Label>
              <Input type="time" value={form.horario} onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
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
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={mutation.isPending}>
              {task ? "Salvar" : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}