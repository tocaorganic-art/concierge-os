import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { saldoDevedor, validarNovoRecebimento, possivelDuplicata, roundCents } from "@/lib/finance";
import { formatBRL } from "@/lib/formatBRL";

// Registra um Recebimento contra uma cobrança (Billing) — ledger imutável
// (regra R3): nunca edita/apaga um Recebimento existente, só cria novos.
// Bloqueia sobrepagamento e data futura (regra R7), e avisa de possível
// duplicata (mesma cobrança+valor+data+método) sem bloquear — quem decide é
// o admin/equipe, ele pode confirmar mesmo assim.
export default function RegistrarRecebimentoDialog({ open, onOpenChange, billing, recebimentos }) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().slice(0, 10));
  const [metodo, setMetodo] = useState("pix");
  const [erro, setErro] = useState("");
  const [confirmarDuplicata, setConfirmarDuplicata] = useState(false);

  const saldo = billing ? saldoDevedor(billing, recebimentos) : 0;

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Recebimento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      queryClient.invalidateQueries({ queryKey: ["recebimentos"] });
      onOpenChange(false);
      setValor("");
      setConfirmarDuplicata(false);
      setErro("");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro("");
    const valorNum = Number(valor);
    const validacao = validarNovoRecebimento(billing, recebimentos, valorNum, dataRecebimento);
    if (validacao) {
      setErro(validacao);
      return;
    }
    if (!confirmarDuplicata && possivelDuplicata(billing, recebimentos, valorNum, dataRecebimento, metodo)) {
      setConfirmarDuplicata(true);
      setErro("Já existe um recebimento igual (mesma cobrança, valor, data e método) lançado. Clique em Confirmar de novo para lançar mesmo assim.");
      return;
    }
    mutation.mutate({
      billing_id: billing.id,
      client_id: billing.client_id,
      valor: valorNum,
      data_recebimento: dataRecebimento,
      metodo,
    });
  };

  if (!billing) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar Recebimento</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground -mt-2">
          {billing.descricao || billing.client_nome} — saldo devedor <span className="text-primary font-semibold">{formatBRL(saldo)}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Valor recebido (R$)</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => { setValor(e.target.value); setConfirmarDuplicata(false); }} className="mt-1.5 bg-secondary border-border" required />
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Data do recebimento</Label>
            <Input type="date" value={dataRecebimento} onChange={(e) => { setDataRecebimento(e.target.value); setConfirmarDuplicata(false); }} className="mt-1.5 bg-secondary border-border" max={new Date().toISOString().slice(0, 10)} required />
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Método</Label>
            <Select value={metodo} onValueChange={(v) => { setMetodo(v); setConfirmarDuplicata(false); }}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {erro && <p className="text-xs text-amber-400">{erro}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {confirmarDuplicata ? "Confirmar mesmo assim" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Estorno = novo Recebimento com valor negativo, referenciando o original
// (estorno_de_id) + motivo obrigatório. Nunca edita nem apaga o recebimento
// original (regra R3).
export function EstornarRecebimentoDialog({ open, onOpenChange, recebimento }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Recebimento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      queryClient.invalidateQueries({ queryKey: ["recebimentos"] });
      onOpenChange(false);
      setMotivo("");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motivo.trim() || !recebimento) return;
    mutation.mutate({
      billing_id: recebimento.billing_id,
      client_id: recebimento.client_id,
      valor: -roundCents(recebimento.valor),
      data_recebimento: new Date().toISOString().slice(0, 10),
      estorno_de_id: recebimento.id,
      motivo_estorno: motivo.trim(),
    });
  };

  if (!recebimento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Estornar Recebimento</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Isso lança um estorno de {formatBRL(roundCents(recebimento.valor))} — o recebimento original não é apagado, fica no histórico junto com o estorno.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Motivo do estorno</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1.5 bg-secondary border-border" required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending || !motivo.trim()}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Confirmar Estorno
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
