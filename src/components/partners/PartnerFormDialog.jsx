import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UtensilsCrossed, Palmtree, Car, Building2, Ticket, Sparkles } from "lucide-react";

const EMPTY = { nome: "", categoria: "restaurante", cidade: "", estado: "", telefone: "", email: "", comissao_pct: "", descricao: "", ativo: true };

export default function PartnerFormDialog({ open, partner, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  useEffect(() => {
    setForm(partner ? { ...partner } : EMPTY);
  }, [partner, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) =>
      partner
        ? base44.entities.Partner.update(partner.id, data)
        : base44.entities.Partner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, comissao_pct: form.comissao_pct ? Number(form.comissao_pct) : undefined };
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{partner ? "Editar parceiro" : "Novo parceiro"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <Input required placeholder="Nome do parceiro *" value={form.nome} onChange={(e) => set("nome", e.target.value)} />

          <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="restaurante"><span className="inline-flex items-center gap-1.5"><UtensilsCrossed className="w-3.5 h-3.5" /> Restaurante</span></SelectItem>
              <SelectItem value="passeio"><span className="inline-flex items-center gap-1.5"><Palmtree className="w-3.5 h-3.5" /> Passeio</span></SelectItem>
              <SelectItem value="transfer"><span className="inline-flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Transfer</span></SelectItem>
              <SelectItem value="hospedagem"><span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Hospedagem</span></SelectItem>
              <SelectItem value="evento"><span className="inline-flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> Evento</span></SelectItem>
              <SelectItem value="outros"><span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Outros</span></SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input placeholder="Cidade" value={form.cidade || ""} onChange={(e) => set("cidade", e.target.value)} className="flex-1" />
            <Input placeholder="Estado" value={form.estado || ""} onChange={(e) => set("estado", e.target.value)} className="w-24" />
          </div>

          <div className="flex gap-2">
            <Input placeholder="Telefone / WhatsApp" value={form.telefone || ""} onChange={(e) => set("telefone", e.target.value)} className="flex-1" />
            <Input placeholder="% Comissão" type="number" value={form.comissao_pct || ""} onChange={(e) => set("comissao_pct", e.target.value)} className="w-28" />
          </div>

          <Input placeholder="Email" type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />

          <Textarea placeholder="Descrição dos serviços" value={form.descricao || ""} onChange={(e) => set("descricao", e.target.value)} className="resize-none min-h-[72px]" />

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="ativo" checked={form.ativo} onChange={(e) => set("ativo", e.target.checked)} className="accent-primary" />
            <label htmlFor="ativo" className="text-sm text-muted-foreground">Parceiro ativo</label>
          </div>

          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pb-6 pt-3 mt-1 bg-background flex gap-2 z-10">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {partner ? "Salvar" : "Criar parceiro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}