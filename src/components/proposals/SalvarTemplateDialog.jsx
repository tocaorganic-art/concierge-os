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
import { Loader2, Save } from "lucide-react";

// Salva a proposta aberta no formulário como um template reutilizável.
export default function SalvarTemplateDialog({ open, onOpenChange, defaults }) {
  const [nome, setNome] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setNome(defaults?.destino ? `Template ${defaults.destino}` : "");
  }, [open, defaults?.destino]);

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.ProposalTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      nome,
      destino: defaults?.destino || undefined,
      servicos: defaults?.servicos || undefined,
      observacoes: defaults?.observacoes || undefined,
      valor_base: defaults?.valor ? Number(defaults.valor) : undefined,
      num_pax: defaults?.num_pax ? Number(defaults.num_pax) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Save className="w-4 h-4 text-primary" /> Salvar como template
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Nome do template</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1.5 bg-secondary border-border" placeholder="Ex.: Villa Trancoso 6 noites" required autoFocus />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Guarda destino, serviços, observações, valor base e nº de pax atuais para reaproveitar em novas propostas.
          </p>
          {mutation.isError && <p className="text-xs text-red-400">Não foi possível salvar o template. Tente novamente.</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}