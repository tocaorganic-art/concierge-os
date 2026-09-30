import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { CLASSIFICATION_COLORS } from "@/lib/clientColor";

const defaultForm = { nome: "", email: "", telefone: "", tipo: "", origem: "", notas: "", cor_classificacao: "" };

export default function ClientFormDialog({ open, onOpenChange, client }) {
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (client) {
      setForm({
        nome: client.nome || "",
        email: client.email || "",
        telefone: client.telefone || "",
        tipo: client.tipo || "",
        origem: client.origem || "",
        notas: client.notas || "",
        cor_classificacao: client.cor_classificacao || "",
      });
    } else {
      setForm(defaultForm);
    }
  }, [client, open]);

  const mutation = useMutation({
    mutationFn: (data) =>
      client
        ? base44.entities.Client.update(client.id, data)
        : base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {client ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="mt-1.5 bg-secondary border-border" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="familia">Família</SelectItem>
                  <SelectItem value="casal">Casal</SelectItem>
                  <SelectItem value="grupo">Grupo</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="corporativo">Corporativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Origem</Label>
              <Input value={form.origem} onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Instagram, indicação..." />
            </div>
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Notas / Preferências</Label>
            <Textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} className="mt-1.5 bg-secondary border-border" rows={3} />
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Classificação por cor</Label>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {Object.entries(CLASSIFICATION_COLORS).map(([key, hex]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, cor_classificacao: f.cor_classificacao === key ? "" : key }))}
                  title={key}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.cor_classificacao === key ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pb-6 pt-4 mt-2 bg-card border-t border-border flex justify-end gap-3 z-10">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={mutation.isPending}>
              {client ? "Salvar" : "Criar Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}