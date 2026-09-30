import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Categorias sugeridas — campo no banco é texto livre (ContratoFornecedor.categoria),
// então isto é só uma lista de partida; "Outros" cai para digitação manual.
export const CATEGORIAS_FORNECEDOR = ["Imóvel", "Transporte/Van", "Equipe da Casa", "Bem-estar/Massagista", "Compras/Mercado", "Som", "Outros"];

const EMPTY = { fornecedor_nome: "", categoria: "", custo_total: "", observacoes: "" };

// Só os campos que este form realmente edita — nunca `{...contrato}` inteiro
// no payload de update, pra não apagar parcelas/caucao_valor/comissao_recebida/
// documento_url de registros que já têm esses campos preenchidos (o SDK faz
// merge parcial, então mandar só o que mudou preserva o resto).
export default function ContratoFornecedorFormDialog({ open, onOpenChange, contrato, proposalId, clientId }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  useEffect(() => {
    setForm(
      contrato
        ? {
            fornecedor_nome: contrato.fornecedor_nome || "",
            categoria: contrato.categoria || "",
            custo_total: contrato.custo_total ?? "",
            observacoes: contrato.observacoes || "",
          }
        : EMPTY
    );
  }, [contrato, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) =>
      contrato
        ? base44.entities.ContratoFornecedor.update(contrato.id, data)
        : base44.entities.ContratoFornecedor.create({ ...data, proposal_id: proposalId, client_id: clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos-fornecedor", proposalId] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      fornecedor_nome: form.fornecedor_nome.trim(),
      categoria: form.categoria,
      custo_total: form.custo_total ? Number(form.custo_total) : 0,
      observacoes: form.observacoes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{contrato ? "Editar fornecedor" : "Adicionar fornecedor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <Input required placeholder="Nome do fornecedor *" value={form.fornecedor_nome} onChange={(e) => set("fornecedor_nome", e.target.value)} />

          <Select value={form.categoria || undefined} onValueChange={(v) => set("categoria", v)}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {CATEGORIAS_FORNECEDOR.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input required type="number" placeholder="Custo fechado com o fornecedor (R$) *" value={form.custo_total} onChange={(e) => set("custo_total", e.target.value)} />

          <Textarea placeholder="Observações (parcelas, condições, alertas...)" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} className="resize-none min-h-[72px]" />

          <p className="text-[11px] text-muted-foreground">
            Nunca aparece pro cliente — uso interno, pra calcular sua margem nesta viagem.
          </p>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {contrato ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
