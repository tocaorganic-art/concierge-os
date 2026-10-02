import React, { useState } from "react";
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
import { LayoutTemplate, Loader2, Pencil, Trash2, Plus } from "lucide-react";

// Gerenciador de templates de proposta: cria, edita e exclui estruturas
// prontas de serviços/observações para reusar em novas propostas.
export default function TemplateManagerDialog({ open, onOpenChange }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["proposal-templates"],
    queryFn: () => base44.entities.ProposalTemplate.list("nome", 100),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      editing?.id
        ? base44.entities.ProposalTemplate.update(editing.id, data)
        : base44.entities.ProposalTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
      setForm(null);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProposalTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposal-templates"] }),
  });

  const startNew = () => {
    setEditing(null);
    setForm({ nome: "", destino: "", servicos: "", observacoes: "", valor_base: "", num_pax: "" });
  };

  const startEdit = (tpl) => {
    setEditing(tpl);
    setForm({
      nome: tpl.nome || "",
      destino: tpl.destino || "",
      servicos: tpl.servicos || "",
      observacoes: tpl.observacoes || "",
      valor_base: tpl.valor_base || "",
      num_pax: tpl.num_pax || "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      nome: form.nome,
      destino: form.destino || undefined,
      servicos: form.servicos || undefined,
      observacoes: form.observacoes || undefined,
      valor_base: form.valor_base ? Number(form.valor_base) : undefined,
      num_pax: form.num_pax ? Number(form.num_pax) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setForm(null); setEditing(null); } }}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-primary" /> Templates de proposta
          </DialogTitle>
        </DialogHeader>

        {form ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Nome do template</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Ex.: Villa Trancoso 6 noites" required />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Destino padrão (opcional)</Label>
              <Input value={form.destino} onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Ex.: Trancoso" />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Serviços incluídos</Label>
              <Textarea value={form.servicos} onChange={(e) => setForm((f) => ({ ...f, servicos: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Villa exclusiva, transfers, chef, roteiro..." rows={6} />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} className="mt-1.5 bg-secondary border-border" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Valor base (R$)</Label>
                <Input type="number" value={form.valor_base} onChange={(e) => setForm((f) => ({ ...f, valor_base: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="0" />
              </div>
              <div>
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Nº Pax padrão</Label>
                <Input type="number" value={form.num_pax} onChange={(e) => setForm((f) => ({ ...f, num_pax: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="0" />
              </div>
            </div>
            {mutation.isError && <p className="text-xs text-red-400">Não foi possível salvar o template. Tente novamente.</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setForm(null); setEditing(null); }}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editing ? "Salvar" : "Criar template"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={startNew}>
              <Plus className="w-3.5 h-3.5" /> Novo template
            </Button>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-secondary border border-border rounded-lg px-3 py-3">
                Nenhum template ainda — crie um com os serviços que você mais usa e reaproveite em toda proposta nova.
              </p>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="bg-secondary border border-border rounded-lg px-3 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{tpl.nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {tpl.destino ? `${tpl.destino} · ` : ""}
                      {tpl.servicos ? tpl.servicos.slice(0, 60) : "sem serviços"}
                    </p>
                  </div>
                  <button type="button" onClick={() => startEdit(tpl)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(tpl.id)} className="text-muted-foreground hover:text-danger flex-shrink-0">
                    {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}