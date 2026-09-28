import React, { useState, useEffect, useRef } from "react";
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
import { FileText, Loader2, X } from "lucide-react";

const defaultForm = {
  client_id: "",
  client_nome: "",
  destino: "",
  data_chegada: "",
  data_saida: "",
  num_pax: "",
  valor: "",
  status: "lead",
  data_validade: "",
  servicos: "",
  observacoes: "",
  forma_pagamento_preferida: "pix_pj_cora",
  chave_pix_recebimento: "",
  contrato_assinado_url: "",
};

export default function ProposalFormDialog({ open, onOpenChange, proposal }) {
  const [form, setForm] = useState(defaultForm);
  const [uploadingContrato, setUploadingContrato] = useState(false);
  const [uploadContratoError, setUploadContratoError] = useState("");
  const contratoInputRef = useRef(null);
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
        data_validade: proposal.data_validade || "",
        servicos: proposal.servicos || "",
        observacoes: proposal.observacoes || "",
        forma_pagamento_preferida: proposal.forma_pagamento_preferida || "pix_pj_cora",
        chave_pix_recebimento: proposal.chave_pix_recebimento || "",
        contrato_assinado_url: proposal.contrato_assinado_url || "",
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
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Válida até</Label>
              <Input
                type="date"
                value={form.data_validade}
                onChange={(e) => setForm((f) => ({ ...f, data_validade: e.target.value }))}
                className="mt-1.5 bg-secondary border-border"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Sem efeito depois de confirmada — só marca como expirada enquanto está em Lead/Proposta.</p>
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
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Como pagar (cliente)</Label>
              <Select value={form.forma_pagamento_preferida} onValueChange={(v) => setForm((f) => ({ ...f, forma_pagamento_preferida: v }))}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix_pj_cora">Pix da empresa (padrão)</SelectItem>
                  <SelectItem value="pix_cpf_tony">Pix pessoal deste contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.forma_pagamento_preferida === "pix_cpf_tony" && (
              <div>
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Chave Pix de recebimento</Label>
                <Input
                  value={form.chave_pix_recebimento}
                  onChange={(e) => setForm((f) => ({ ...f, chave_pix_recebimento: e.target.value }))}
                  className="mt-1.5 bg-secondary border-border"
                  placeholder="CPF, email, telefone ou chave aleatória"
                />
              </div>
            )}
            <div className="col-span-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Contrato assinado (PDF/imagem)</Label>
              <input
                ref={contratoInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingContrato(true);
                  setUploadContratoError("");
                  try {
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    setForm((f) => ({ ...f, contrato_assinado_url: file_url }));
                  } catch {
                    setUploadContratoError("Não consegui enviar o arquivo. Tente novamente.");
                  } finally {
                    setUploadingContrato(false);
                    if (contratoInputRef.current) contratoInputRef.current.value = "";
                  }
                }}
              />
              {form.contrato_assinado_url ? (
                <div className="mt-1.5 flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <a href={form.contrato_assinado_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-1 truncate">
                    Ver contrato anexado
                  </a>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, contrato_assinado_url: "" }))}>
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled={uploadingContrato} onClick={() => contratoInputRef.current?.click()} className="mt-1.5 gap-1.5">
                  {uploadingContrato ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  {uploadingContrato ? "Enviando..." : "Anexar contrato assinado"}
                </Button>
              )}
              {uploadContratoError && <p className="text-[11px] text-red-400 mt-1">{uploadContratoError}</p>}
              <p className="text-[11px] text-muted-foreground mt-1">Aparece integralmente em "Meu Contrato" para o cliente.</p>
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