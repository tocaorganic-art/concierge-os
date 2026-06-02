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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const defaultForm = { client_id: "", client_nome: "", descricao: "", valor: "", status: "pendente", data_vencimento: "" };

export default function BillingFormDialog({ open, onOpenChange, billing }) {
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  useEffect(() => {
    if (billing) {
      setForm({
        client_id: billing.client_id || "",
        client_nome: billing.client_nome || "",
        descricao: billing.descricao || "",
        valor: billing.valor || "",
        status: billing.status || "pendente",
        data_vencimento: billing.data_vencimento || "",
      });
    } else {
      setForm(defaultForm);
    }
  }, [billing, open]);

  const mutation = useMutation({
    mutationFn: (data) =>
      billing
        ? base44.entities.Billing.update(billing.id, data)
        : base44.entities.Billing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      onOpenChange(false);
    },
  });

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({ ...f, client_id: clientId, client_nome: client?.nome || "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ ...form, valor: form.valor ? Number(form.valor) : 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {billing ? "Editar Cobrança" : "Nova Cobrança"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Cliente</Label>
            <Select value={form.client_id} onValueChange={handleClientChange}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
            <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Pacote Maldivas, Transfer..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Valor (R$)</Label>
              <Input type="number" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} className="mt-1.5 bg-secondary border-border" required />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Vencimento</Label>
              <Input type="date" value={form.data_vencimento} onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
            </div>
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={mutation.isPending}>
              {billing ? "Salvar" : "Criar Cobrança"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}