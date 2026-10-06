import React, { useState, useEffect, useRef, useMemo } from "react";
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Loader2, Sparkles, CheckCircle2, ImageIcon, X, Plus, Lock, Building2, Trash2 } from "lucide-react";
import { CLIENTE_INTERNO_ID, CLIENTE_INTERNO_NOME } from "@/lib/finance";
import { useLanguage, translateCategoria } from "@/lib/i18n";
import { useCategorias } from "@/lib/useCategorias";
import { TIPO_DESPESA, criarOuReativarCategoria, garantirCategoria, norm as normalize, opcoesComAtual } from "@/lib/categoriasCatalogo";

const defaultForm = {
  client_id: "",
  client_nome: "",
  proposal_id: "",
  categoria: "",
  descricao: "",
  fornecedor: "",
  valor: "",
  valor_cobrado_cliente: "",
  margem_admin: "",
  data_despesa: "",
  comprovante_url: "",
  origem: "manual",
  status: "pago",
};

const NEW_CATEGORY_VALUE = "__nova__";

export default function ExpenseFormDialog({ open, onOpenChange, expense, defaultClientId }) {
  const { lang } = useLanguage();
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [aiFilled, setAiFilled] = useState(false);
  const [creatingCategoria, setCreatingCategoria] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  // Categorias vêm do catálogo BillingCategory (Fase 5), não mais do distinct()
  // dos registros salvos — uma categoria criada aqui existe mesmo que o
  // formulário seja cancelado em seguida.
  const { categorias: categoriasAtivas } = useCategorias(TIPO_DESPESA, { enabled: open });
  const categoriasExistentes = useMemo(() => opcoesComAtual(categoriasAtivas, form.categoria), [categoriasAtivas, form.categoria]);

  useEffect(() => {
    if (expense) {
      setForm({
        client_id: expense.client_id || "",
        client_nome: expense.client_nome || "",
        proposal_id: expense.proposal_id || "",
        categoria: expense.categoria || "",
        descricao: expense.descricao || "",
        fornecedor: expense.fornecedor || "",
        valor: expense.valor ?? "",
        valor_cobrado_cliente: expense.valor_cobrado_cliente ?? "",
        margem_admin: expense.margem_admin ?? "",
        data_despesa: expense.data_despesa || "",
        comprovante_url: expense.comprovante_url || "",
        origem: expense.origem || "manual",
        status: expense.status || "pago",
      });
      setAiFilled(expense.origem === "ia_nota_fiscal");
    } else {
      setForm({ ...defaultForm, client_id: defaultClientId || "" });
      setAiFilled(false);
    }
    setCreatingCategoria(false);
    setNovaCategoria("");
    setUploadError("");
  }, [expense, open, defaultClientId]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      await garantirCategoria({ nome: data.categoria, tipo: TIPO_DESPESA }).catch(() => {});
      return expense
        ? base44.entities.Expense.update(expense.id, data)
        : base44.entities.Expense.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["billing-categories"] });
      onOpenChange(false);
    },
  });

  // Exclusão só para admin master, e sempre em dois cliques (confirmação)
  // pra não apagar um lançamento por engano.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Expense.delete(expense.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    setConfirmingDelete(false);
  }, [expense, open]);

  const INTERNAL_VALUE = "__interno__";
  const handleClientChange = (clientId) => {
    if (clientId === INTERNAL_VALUE) {
      // Custo interno da operação (ex.: ferramentas, assinaturas) — sem
      // cliente/evento vinculado; não entra em KPI por cliente.
      setForm((f) => ({ ...f, client_id: CLIENTE_INTERNO_ID, client_nome: CLIENTE_INTERNO_NOME, proposal_id: "" }));
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({ ...f, client_id: clientId, client_nome: client?.nome || "" }));
  };

  const applyCategoria = (extraidaBruta) => {
    if (!extraidaBruta) return null;
    const match = categoriasExistentes.find((c) => normalize(c) === normalize(extraidaBruta));
    return match || extraidaBruta.trim();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, comprovante_url: file_url }));

      const listaCategorias = categoriasExistentes.join(", ");
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            fornecedor: { type: "string", description: "Nome do fornecedor, loja, prestador de serviço ou pessoa que recebeu o pagamento" },
            valor: { type: "number", description: "Valor total pago, conforme a nota fiscal, recibo ou comprovante (ex: comprovante de Pix)" },
            data_despesa: { type: "string", format: "date", description: "Data da compra ou pagamento (YYYY-MM-DD)" },
            categoria_sugerida: {
              type: "string",
              description: `Categoria mais apropriada para esta despesa, em português, curta. Categorias já usadas neste negócio: ${listaCategorias || "nenhuma ainda"}. Reutilize uma dessas se fizer sentido (mesmo nome, mesma grafia). Se nenhuma servir, proponha uma categoria nova, curta e específica (ex: Festas, Aluguel de Som, DJ, Churrasqueiro, Massagista) em vez de usar algo genérico.`,
            },
            descricao: { type: "string", description: "Breve descrição do que foi comprado ou pago" },
          },
        },
      });

      const data = extracted?.output || extracted || {};
      setForm((f) => ({
        ...f,
        fornecedor: data.fornecedor || f.fornecedor,
        valor: data.valor ?? f.valor,
        data_despesa: data.data_despesa || f.data_despesa,
        categoria: applyCategoria(data.categoria_sugerida) || f.categoria,
        descricao: data.descricao || f.descricao,
        origem: "ia_nota_fiscal",
      }));
      setAiFilled(true);
    } catch (err) {
      setUploadError("Não consegui ler o comprovante automaticamente. Preencha os campos manualmente.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCategoriaSelect = (value) => {
    if (value === NEW_CATEGORY_VALUE) {
      setCreatingCategoria(true);
      setNovaCategoria("");
    } else {
      setCreatingCategoria(false);
      setForm((f) => ({ ...f, categoria: value }));
    }
  };

  // Grava no catálogo na hora (não espera salvar a despesa): cancelar o
  // formulário depois não perde a categoria. Se a gravação falhar, a
  // categoria ainda fica selecionada no formulário e é garantida ao salvar.
  const confirmNovaCategoria = async () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    setCreatingCategoria(false);
    setForm((f) => ({ ...f, categoria: nome }));
    try {
      const canonico = await criarOuReativarCategoria({ nome, tipo: TIPO_DESPESA });
      queryClient.invalidateQueries({ queryKey: ["billing-categories"] });
      if (canonico) setForm((f) => (normalize(f.categoria) === normalize(nome) ? { ...f, categoria: canonico } : f));
    } catch {
      // sem permissão ou rede: segue com o nome no formulário
    }
  };

  // Margem sugerida automaticamente quando os dois valores estão preenchidos, mas o campo continua editável
  const margemSugerida = useMemo(() => {
    const cheio = parseFloat(form.valor_cobrado_cliente);
    const real = parseFloat(form.valor);
    if (!isNaN(cheio) && !isNaN(real) && form.valor_cobrado_cliente !== "") {
      return (cheio - real).toFixed(2);
    }
    return null;
  }, [form.valor_cobrado_cliente, form.valor]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      valor: form.valor ? Number(form.valor) : 0,
      valor_cobrado_cliente: form.valor_cobrado_cliente !== "" ? Number(form.valor_cobrado_cliente) : null,
      margem_admin: form.margem_admin !== "" ? Number(form.margem_admin) : (margemSugerida !== null ? Number(margemSugerida) : null),
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            {expense ? "Editar Despesa" : "Nova Despesa"}
          </DialogTitle>
        </DialogHeader>

        {/* Upload de comprovante */}
        <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />
          {form.comprovante_url ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium truncate">Comprovante anexado</p>
                {aiFilled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20 mt-1">
                    <Sparkles className="w-2.5 h-2.5" /> Lido por IA
                  </span>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, comprovante_url: "" }))}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Lendo comprovante com IA...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" /> Tirar foto ou anexar nota fiscal
                </>
              )}
            </button>
          )}
          {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
          {!form.comprovante_url && !uploading && (
            <p className="text-[11px] text-muted-foreground text-center mt-1">A IA preenche fornecedor, valor, data e categoria automaticamente — e cria a categoria se ela ainda não existir</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Cliente / Evento</Label>
            <Select
              value={form.client_id === CLIENTE_INTERNO_ID ? INTERNAL_VALUE : form.client_id}
              onValueChange={handleClientChange}
            >
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={INTERNAL_VALUE} className="text-primary font-medium">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {CLIENTE_INTERNO_NOME}</span>
                </SelectItem>
                <SelectSeparator />
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Categoria</Label>
            {creatingCategoria ? (
              <div className="flex gap-2 mt-1.5">
                <Input
                  autoFocus
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  placeholder="Ex: Festas, DJ, Aluguel de Som..."
                  className="bg-secondary border-border"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmNovaCategoria(); } }}
                />
                <Button type="button" size="sm" onClick={confirmNovaCategoria} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  OK
                </Button>
              </div>
            ) : (
              <Select value={form.categoria || undefined} onValueChange={handleCategoriaSelect}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Selecionar ou criar categoria" /></SelectTrigger>
                <SelectContent>
                  {categoriasExistentes.map((c) => (
                    <SelectItem key={c} value={c}>{translateCategoria(c, lang)}</SelectItem>
                  ))}
                  <SelectItem value={NEW_CATEGORY_VALUE} className="text-primary font-medium">
                    <span className="flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Criar nova categoria</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Fornecedor / Pessoa</Label>
            <Input value={form.fornecedor} onChange={(e) => setForm((f) => ({ ...f, fornecedor: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Ex: Locadora Praia, Herlon Hamm..." />
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className="mt-1.5 bg-secondary border-border min-h-[60px] resize-none" placeholder="Aluguel da casa, diária do caseiro, van executiva..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Valor pago (R$)</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} className="mt-1.5 bg-secondary border-border" required />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Data</Label>
              <Input type="date" value={form.data_despesa} onChange={(e) => setForm((f) => ({ ...f, data_despesa: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
            </div>
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pago">Pago (já saiu do bolso)</SelectItem>
                <SelectItem value="pendente">Pendente (orçamento/parcela futura)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAdmin && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-primary">
                <Lock className="w-3 h-3" /> Admin Master — só você vê isso
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Preço cheio (cobrado do cliente)</Label>
                  <Input type="number" step="0.01" value={form.valor_cobrado_cliente} onChange={(e) => setForm((f) => ({ ...f, valor_cobrado_cliente: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Deixe em branco se não houver markup" />
                </div>
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Sua margem real</Label>
                  <Input type="number" step="0.01" value={form.margem_admin !== "" ? form.margem_admin : (margemSugerida ?? "")} onChange={(e) => setForm((f) => ({ ...f, margem_admin: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder={margemSugerida !== null ? `Sugerido: ${margemSugerida}` : "0.00"} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Equipe e cliente só enxergam o preço cheio (ou o que for exposto na proposta/fatura) — este campo nunca aparece pra eles.</p>
            </div>
          )}

          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 pb-6 pt-4 mt-2 bg-card border-t border-border flex justify-between gap-3 z-10">
            {isAdmin && expense ? (
              confirmingDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Confirmar exclusão
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </Button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" disabled={mutation.isPending || uploading || !form.categoria}>
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {expense ? "Salvar" : "Lançar Despesa"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}