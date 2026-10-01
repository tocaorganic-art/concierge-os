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
import { FileText, Loader2, X, Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/formatBRL";
import { categoriaFornecedorVisual } from "@/lib/uiTones";
import ContratoFornecedorFormDialog from "@/components/proposals/ContratoFornecedorFormDialog";
import LeituraContratoModal from "@/components/proposals/LeituraContratoModal";

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
  const [formError, setFormError] = useState("");
  const [showFornecedorForm, setShowFornecedorForm] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState(null);
  const [deletingFornecedor, setDeletingFornecedor] = useState(null);
  const [showLeituraContrato, setShowLeituraContrato] = useState(false);
  const contratoInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  // Custo fechado com cada fornecedor desta viagem — uso interno (nunca
  // exposto ao cliente), pra calcular a margem ao lado do valor cobrado
  // dele. Só existe depois que a proposta já foi criada (precisa do id).
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["contratos-fornecedor", proposal?.id],
    queryFn: () => base44.entities.ContratoFornecedor.filter({ proposal_id: proposal.id }),
    enabled: !!proposal?.id,
  });

  const deleteFornecedorMutation = useMutation({
    mutationFn: (id) => base44.entities.ContratoFornecedor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos-fornecedor", proposal?.id] });
      setDeletingFornecedor(null);
    },
  });

  const custoFornecedoresTotal = fornecedores.reduce((sum, f) => sum + (f.custo_total || 0), 0);
  const margemEstimada = (Number(form.valor) || 0) - custoFornecedoresTotal;

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
    setFormError("");
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
    // Sem isso, um erro do backend (validação, permissão, rede) só aparecia
    // no console — o modal ficava parado, sem nenhum aviso pro usuário
    // (o botão reabilitava e nada mais acontecia, dando a impressão de tela
    // travada). Mesmo padrão já usado em BillingFormDialog.
    onError: (err) => {
      setFormError(`Não foi possível salvar a proposta${err?.message ? `: ${err.message}` : "."} Tente novamente.`);
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
    setFormError("");
    mutation.mutate({
      ...form,
      num_pax: form.num_pax ? Number(form.num_pax) : undefined,
      valor: form.valor ? Number(form.valor) : undefined,
    });
  };

  return (
    <>
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
                    // Dispara a leitura por IA assim que o contrato é anexado — só
                    // quando a proposta já existe (precisa do id pra aplicar depois
                    // da confirmação). Numa proposta nova, o admin ainda pode ler o
                    // contrato depois de salvar, com o botão "Ler contrato com IA".
                    if (proposal?.id) setShowLeituraContrato(true);
                  } catch {
                    setUploadContratoError("Não consegui enviar o arquivo. Tente novamente.");
                  } finally {
                    setUploadingContrato(false);
                    if (contratoInputRef.current) contratoInputRef.current.value = "";
                  }
                }}
              />
              {form.contrato_assinado_url ? (
                <div className="mt-1.5 space-y-1.5">
                  <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <a href={form.contrato_assinado_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-1 truncate">
                      Ver contrato anexado
                    </a>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, contrato_assinado_url: "" }))}>
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
                    </button>
                  </div>
                  {proposal?.id && (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setShowLeituraContrato(true)}>
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Ler contrato com IA
                      {proposal.contrato_dados_extraidos && <span className="text-[10px] text-muted-foreground">(lido em {new Date(proposal.contrato_dados_extraidos.lido_em).toLocaleDateString("pt-BR")})</span>}
                    </Button>
                  )}
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
            {proposal?.id && (
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Fornecedores desta viagem</Label>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => { setEditingFornecedor(null); setShowFornecedorForm(true); }}>
                    <Plus className="w-3 h-3" /> Adicionar
                  </Button>
                </div>
                {fornecedores.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground bg-secondary border border-border rounded-lg px-3 py-2">
                    Nenhum fornecedor lançado ainda — custo fechado, nunca visível ao cliente.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {fornecedores.map((f) => {
                      const cat = categoriaFornecedorVisual(f.categoria);
                      return (
                      <div key={f.id} className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                          <cat.Icon className={`w-3.5 h-3.5 ${cat.className}`} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{f.fornecedor_nome}{f.categoria ? ` · ${f.categoria}` : ""}</p>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{formatBRL(f.custo_total || 0)}</span>
                        <button type="button" onClick={() => { setEditingFornecedor(f); setShowFornecedorForm(true); }} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeletingFornecedor(f)} className="text-muted-foreground hover:text-danger flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 px-1 text-xs">
                  <span className="text-muted-foreground">Margem estimada (valor cliente − custo fornecedores)</span>
                  <span className={`font-mono font-semibold ${margemEstimada < 0 ? "text-danger" : "text-success"}`}>{formatBRL(margemEstimada)}</span>
                </div>
              </div>
            )}
          </div>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pb-6 pt-4 mt-2 bg-card border-t border-border flex justify-end gap-3 z-10">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {proposal ? "Salvar" : "Criar Proposta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {proposal?.id && (
      <>
        <ContratoFornecedorFormDialog
          open={showFornecedorForm}
          onOpenChange={setShowFornecedorForm}
          contrato={editingFornecedor}
          proposalId={proposal.id}
          clientId={proposal.client_id}
        />
        <LeituraContratoModal
          open={showLeituraContrato}
          onOpenChange={setShowLeituraContrato}
          proposal={{ ...proposal, ...form }}
          onConfirmed={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />
        <Dialog open={!!deletingFornecedor} onOpenChange={(v) => !v && setDeletingFornecedor(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Excluir fornecedor</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground -mt-2">
              Tem certeza que quer excluir <strong className="text-foreground">{deletingFornecedor?.fornecedor_nome}</strong> desta viagem? Essa ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDeletingFornecedor(null)}>Cancelar</Button>
              <Button type="button" variant="destructive" disabled={deleteFornecedorMutation.isPending} onClick={() => deleteFornecedorMutation.mutate(deletingFornecedor.id)}>
                {deleteFornecedorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )}
    </>
  );
}