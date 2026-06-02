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
  client_id: "",
  client_nome: "",
  destino: "",
  data_chegada: "",
  data_saida: "",
  num_pax: "",
  valor: "",
  status: "lead",
  servicos: "",
  observacoes: "",
};

export default function ProposalFormDialog({ open, onOpenChange, proposal }) {
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  useEffect(() => {
    if (proposal) {
      setForm({
        client_id: proposal.client_id || "",
        client_nome: proposal.client_nome || "",
        destino: proposal.destino || "",
        data_chegada: proposal.data_chegada || "",
        data_saida: proposal.data_saida || "",
        num_pax: proposal.num_pax || "",
        valor: proposal.valor || "",
        status: proposal.status || "lead",
        servicos: proposal.servicos || "",
        observacoes: proposal.observacoes || "",
      });
    } else {
      setForm(defaultForm);
    }
  }, [proposal, open]);

  const mutation = useMutation({
    mutationFn: (data) =>
      proposal
        ? base44.entities.Proposal.update(proposal.id, data)
        : base44.entities.Proposal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      onOpenChange(false);
    },
  });

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({
      ...f,
      client_id: clientId,
      client_nome: client?.nome || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      num_pax: form.num_pax ? Number(form.num_pax) : undefined,
      valor: form.valor ? Number(form.valor) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {proposal ? "Editar Proposta" : "Nova Proposta"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Cliente</Label>
              <Select value={form.client_id} onValueChange={handleClientChange}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border">
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Destino</Label>
              <Input
                value={form.destino}
                onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
                className="mt-1.5 bg-secondary border-border"
                placeholder="Ex: Maldivas"
                required
              />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Chegada</Label>
              <Input
                type="date"
                value={form.data_chegada}
                onChange={(e) => setForm((f) => ({ ...f, data_chegada: e.target.value }))}
                className="mt-1.5 bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Saída</Label>
              <Input
                type="date"
                value={form.data_saida}
                onChange={(e) => setForm((f) => ({ ...f, data_saida: e.target.value }))}
                className="mt-1.5 bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Nº Pax</Label>
              <Input
                type="number"
                value={form.num_pax}
                onChange={(e) => setForm((f) => ({ ...f, num_pax: e.target.value }))}
                className="mt-1.5 bg-secondary border-border"
                placeholder="2"
              />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Valor (R$)</Label>
              <Input
                type="number"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                className="mt-1.5 bg-secondary border-border"
                placeholder="15000"
              />
            </div>
            <div className="col-span-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Serviços Incluídos</Label>
              <Textarea
                value={form.servicos}
                onChange={(e) => setForm((f) => ({ ...f, servicos: e.target.value }))}
                className="mt-1.5 bg-secondary border-border"
                placeholder="Hotel, transfers, passeios..."
                rows={2}
              />
            </div>
            <div className="col-span-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                className="mt-1.5 bg-secondary border-border"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={mutation.isPending}>
              {proposal ? "Salvar" : "Criar Proposta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}