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
import { useLanguage, translateCategoria } from "@/lib/i18n";
import { Camera, Loader2, ImageIcon, X, Sparkles, Layers, Plus, ListPlus } from "lucide-react";
import { possivelBillingDuplicado, comprovantesDoBilling } from "@/lib/finance";

const defaultForm = { client_id: "", client_nome: "", proposal_id: "", descricao: "", categoria: "", valor: "", status: "pendente", data_vencimento: "", comprovante_url: "", tipo_despesa: "variavel", motivo_cancelamento: "" };

function addMonths(dateStr, months) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const CATEGORIAS_BASE = ["Pacote Principal", "Contas a Pagar", "Reserva Financeira"];
const NEW_CATEGORY_VALUE = "__nova__";

function normalize(str) {
  return (str || "").trim().toLowerCase();
}

export default function BillingFormDialog({ open, onOpenChange, billing, clientMode = false, fixedClient = null }) {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState(defaultForm);
  const [creatingCategoria, setCreatingCategoria] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [aiFilled, setAiFilled] = useState(false);
  const [parcelar, setParcelar] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState(2);
  const [multiplas, setMultiplas] = useState(false);
  const [despesasExtra, setDespesasExtra] = useState([{ descricao: "", valor: "" }]);
  const [formError, setFormError] = useState("");
  const [confirmarDuplicata, setConfirmarDuplicata] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list("-created_date", 200),
  });

  const { data: billings = [] } = useQuery({
    queryKey: ["billings"],
    queryFn: () => base44.entities.Billing.list("-created_date", 200),
  });

  const categoriasExistentes = React.useMemo(() => {
    const vistas = new Map();
    [...CATEGORIAS_BASE, ...billings.map((b) => b.categoria).filter(Boolean)].forEach((c) => {
      const key = normalize(c);
      if (key && !vistas.has(key)) vistas.set(key, c);
    });
    return Array.from(vistas.values());
  }, [billings]);

  useEffect(() => {
    if (billing) {
      setForm({
        client_id: billing.client_id || "",
        client_nome: billing.client_nome || "",
        proposal_id: billing.proposal_id || "",
        descricao: billing.descricao || "",
        categoria: billing.categoria || "",
        valor: billing.valor || "",
        status: billing.status || "pendente",
        data_vencimento: billing.data_vencimento || "",
        comprovante_url: billing.comprovante_url || "",
        tipo_despesa: billing.tipo_despesa || "variavel",
        motivo_cancelamento: billing.motivo_cancelamento || "",
      });
    } else if (clientMode && fixedClient?.id) {
      setForm({ ...defaultForm, client_id: fixedClient.id, client_nome: fixedClient.nome || "" });
    } else {
      setForm(defaultForm);
    }
    setCreatingCategoria(false);
    setNovaCategoria("");
    setUploadError("");
    setAiFilled(false);
    setParcelar(false);
    setNumeroParcelas(2);
    setMultiplas(false);
    setDespesasExtra([{ descricao: "", valor: "" }]);
    setFormError("");
    setConfirmarDuplicata(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing, open, clientMode, fixedClient?.id]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (billing) {
        return base44.entities.Billing.update(billing.id, clientMode ? { ...data, ultima_edicao_por: "cliente" } : data);
      }
      if (multiplas) {
        // Cada despesa desta cobrança vira um Billing PRÓPRIO — nunca
        // concatenar descrições num único registro (é exatamente o bug que
        // gerou "Cobrança adicional — Aluguel de Som + Passagem + Apto" com
        // um valor somado só).
        const linhas = despesasExtra.filter((l) => l.descricao.trim() && Number(l.valor) > 0);
        const { descricao: _descricaoIgnorada, valor: _valorIgnorado, ...resto } = data;
        return Promise.all(
          linhas.map((linha) =>
            base44.entities.Billing.create({ ...resto, descricao: linha.descricao.trim(), valor: Number(linha.valor) })
          )
        );
      }
      if (!parcelar) {
        return base44.entities.Billing.create(data);
      }
      // Parcelamento estruturado: gera N cobrancas vinculadas (mesma
      // proposal_id, numero_parcela/total_parcelas preenchidos), em vez de
      // uma unica cobranca com "Parcela X/Y" escrito a mao na descricao.
      const n = Math.max(2, Math.round(numeroParcelas) || 2);
      const total = data.valor;
      const base = Math.floor((total / n) * 100) / 100;
      const ultima = Math.round((total - base * (n - 1)) * 100) / 100;
      const criacoes = Array.from({ length: n }, (_, i) => {
        const valorParcela = i === n - 1 ? ultima : base;
        return base44.entities.Billing.create({
          ...data,
          valor: valorParcela,
          numero_parcela: i + 1,
          total_parcelas: n,
          data_vencimento: addMonths(data.data_vencimento, i),
          descricao: data.descricao ? `${data.descricao} — Parcela ${i + 1}/${n}` : `Parcela ${i + 1}/${n}`,
        });
      });
      return Promise.all(criacoes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      onOpenChange(false);
    },
  });

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({ ...f, client_id: clientId, client_nome: client?.nome || "" }));
  };

  const handleCategoriaChange = (value) => {
    if (value === NEW_CATEGORY_VALUE) {
      setCreatingCategoria(true);
      setNovaCategoria("");
      return;
    }
    setCreatingCategoria(false);
    setForm((f) => ({ ...f, categoria: value }));
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, comprovante_url: file_url }));

      // Mesmo padrão de leitura por IA já usado em ExpenseFormDialog.jsx —
      // só preenche campos ainda vazios, nunca sobrescreve o que o usuário
      // já digitou.
      try {
        const listaCategorias = categoriasExistentes.join(", ");
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              descricao: { type: "string", description: "Descrição curta do que esta cobrança representa (ex: pacote, aluguel de carro, passagem aérea)" },
              valor: { type: "number", description: "Valor total desta cobrança/orçamento, conforme o documento" },
              data_vencimento: { type: "string", format: "date", description: "Data de vencimento ou validade do orçamento (YYYY-MM-DD)" },
              categoria_sugerida: {
                type: "string",
                description: `Categoria mais apropriada para esta cobrança. Categorias já usadas: ${listaCategorias || "nenhuma ainda"}. Reutilize uma dessas se fizer sentido.`,
              },
            },
          },
        });
        const data = extracted?.output || extracted || {};
        setForm((f) => ({
          ...f,
          descricao: f.descricao || data.descricao || f.descricao,
          valor: f.valor || data.valor || f.valor,
          data_vencimento: f.data_vencimento || data.data_vencimento || f.data_vencimento,
          categoria: f.categoria || data.categoria_sugerida || f.categoria,
        }));
        setAiFilled(true);
      } catch {
        // extração falhou — comprovante já foi anexado, só não preencheu sozinho
      }
    } catch (err) {
      setUploadError("Não consegui enviar o arquivo. Tente novamente.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.status === "cancelado" && !form.motivo_cancelamento.trim()) {
      setFormError("Informe o motivo do cancelamento.");
      return;
    }
    setFormError("");

    // Regra R7 estendida a Billing: avisa (não bloqueia) antes de criar uma
    // cobrança idêntica a uma já ativa — mesmo padrão de possivelDuplicata()
    // usado em RegistrarRecebimentoDialog para Recebimento.
    if (!billing && !confirmarDuplicata) {
      const duplicadas = multiplas
        ? despesasExtra
            .filter((l) => l.descricao.trim() && Number(l.valor) > 0)
            .filter((l) => possivelBillingDuplicado(billings, { client_id: form.client_id, descricao: l.descricao, valor: Number(l.valor), data_vencimento: form.data_vencimento }))
        : possivelBillingDuplicado(billings, { client_id: form.client_id, descricao: form.descricao, valor: Number(form.valor) || 0, data_vencimento: form.data_vencimento })
        ? [form]
        : [];
      if (duplicadas.length > 0) {
        setConfirmarDuplicata(true);
        setFormError(
          multiplas
            ? `Já existe cobrança igual a "${duplicadas[0].descricao}" (mesmo cliente, valor e vencimento). Clique em Criar de novo para confirmar mesmo assim.`
            : "Já existe uma cobrança igual (mesmo cliente, descrição, valor e vencimento) ativa. Clique em Criar de novo para confirmar mesmo assim."
        );
        return;
      }
    }

    // Só grava um comprovante NOVO no histórico se a URL mudou desde o que
    // já estava salvo — evita empilhar o mesmo anexo de novo a cada "Salvar"
    // sem upload novo (edição de outro campo, por exemplo).
    const historicoExistente = billing ? comprovantesDoBilling(billing) : [];
    const ultimoUrl = historicoExistente[historicoExistente.length - 1]?.url;
    const comprovantesPayload =
      form.comprovante_url && form.comprovante_url !== ultimoUrl
        ? [...historicoExistente, { url: form.comprovante_url, enviado_por: clientMode ? "cliente" : "equipe", enviado_em: new Date().toISOString() }]
        : undefined;

    mutation.mutate({
      ...form,
      valor: form.valor ? Number(form.valor) : 0,
      ...(comprovantesPayload ? { comprovantes: comprovantesPayload } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {billing ? "Editar Cobrança" : "Nova Cobrança"}
          </DialogTitle>
        </DialogHeader>
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
                <a href={form.comprovante_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline">Ver arquivo</a>
                {aiFilled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20 mt-1 ml-2">
                    <Sparkles className="w-2.5 h-2.5" /> Lido por IA
                  </span>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, comprovante_url: "" }))}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : billing && comprovantesDoBilling(billing).length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                {comprovantesDoBilling(billing).length} comprovante(s) já anexado(s) nesta cobrança.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Lendo com IA...</> : <><Camera className="w-4 h-4" /> Anexar mais um comprovante</>}
              </button>
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Lendo com IA...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" /> Anexar comprovante, nota fiscal ou orçamento
                </>
              )}
            </button>
          )}
          {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
          {!form.comprovante_url && !uploading && (
            <p className="text-[11px] text-muted-foreground text-center mt-1">A IA preenche descrição, valor, vencimento e categoria automaticamente</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!(clientMode && fixedClient?.id) && (
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
          )}
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Proposta vinculada (opcional)</Label>
            <Select value={form.proposal_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, proposal_id: v }))}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                {proposals.filter((p) => !form.client_id || p.client_id === form.client_id).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.destino || p.client_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!billing && (
            <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={multiplas}
                  onChange={(e) => { setMultiplas(e.target.checked); if (e.target.checked) setParcelar(false); }}
                  className="rounded border-border"
                />
                <ListPlus className="w-3.5 h-3.5 text-primary" /> Várias despesas nesta cobrança
              </label>
              {multiplas && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Cada linha vira um registro próprio — nunca junte despesas diferentes numa descrição só.
                  </p>
                  {despesasExtra.map((linha, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={linha.descricao}
                        onChange={(e) => setDespesasExtra((prev) => prev.map((l, idx) => (idx === i ? { ...l, descricao: e.target.value } : l)))}
                        placeholder="Ex: Aluguel de Som (AA Music)"
                        className="bg-secondary border-border flex-1"
                      />
                      <Input
                        type="number"
                        value={linha.valor}
                        onChange={(e) => setDespesasExtra((prev) => prev.map((l, idx) => (idx === i ? { ...l, valor: e.target.value } : l)))}
                        placeholder="R$"
                        className="bg-secondary border-border w-28"
                      />
                      {despesasExtra.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setDespesasExtra((prev) => prev.filter((_, idx) => idx !== i))}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setDespesasExtra((prev) => [...prev, { descricao: "", valor: "" }])} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Adicionar despesa
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Total: R$ {despesasExtra.reduce((s, l) => s + (Number(l.valor) || 0), 0).toLocaleString("pt-BR")} · mesmo vencimento, categoria e cliente abaixo para todas.
                  </p>
                </div>
              )}
            </div>
          )}
          {!multiplas && (
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Pacote Maldivas, Transfer..." />
            </div>
          )}
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Categoria</Label>
            {creatingCategoria ? (
              <div className="mt-1.5 flex gap-2">
                <Input
                  autoFocus
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  placeholder="Ex: Reserva Financeira"
                  className="bg-secondary border-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const val = novaCategoria.trim();
                    if (val) setForm((f) => ({ ...f, categoria: val }));
                    setCreatingCategoria(false);
                  }}
                >
                  OK
                </Button>
              </div>
            ) : (
              <Select value={form.categoria || undefined} onValueChange={handleCategoriaChange}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                <SelectContent>
                  {categoriasExistentes.map((c) => (
                    <SelectItem key={c} value={c}>{translateCategoria(c, lang)}</SelectItem>
                  ))}
                  <SelectItem value={NEW_CATEGORY_VALUE}>+ Criar nova categoria</SelectItem>
                </SelectContent>
              </Select>
            )}
            {form.categoria === "Reserva Financeira" && (
              <p className="text-[11px] text-muted-foreground mt-1">{t("billing_hint_reserva_financeira")}</p>
            )}
            {form.categoria === "Contas a Pagar" && (
              <p className="text-[11px] text-muted-foreground mt-1">{t("billing_hint_contas_a_pagar")}</p>
            )}
          </div>
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tipo de despesa</Label>
            <Select value={form.tipo_despesa} onValueChange={(v) => setForm((f) => ({ ...f, tipo_despesa: v }))}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixa">Fixa (recorrente/prevista em contrato)</SelectItem>
                <SelectItem value="variavel">Variável (serviço adicional)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {!multiplas && (
              <div>
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {parcelar ? "Valor total (R$)" : "Valor (R$)"}
                </Label>
                <Input type="number" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} className="mt-1.5 bg-secondary border-border" required={!multiplas} />
              </div>
            )}
            <div className={multiplas ? "col-span-2" : ""}>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {parcelar ? "1º vencimento" : "Vencimento"}
              </Label>
              <Input type="date" value={form.data_vencimento} onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
            </div>
          </div>

          {!billing && !multiplas && (
            <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={parcelar} onChange={(e) => setParcelar(e.target.checked)} className="rounded border-border" />
                <Layers className="w-3.5 h-3.5 text-primary" /> Dividir em parcelas
              </label>
              {parcelar && (
                <div>
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Número de parcelas</Label>
                  <Input
                    type="number"
                    min={2}
                    max={24}
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(e.target.value)}
                    className="mt-1.5 bg-secondary border-border w-24"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Cria {Math.max(2, Math.round(numeroParcelas) || 2)} cobranças vinculadas, com vencimento mensal a partir da data acima — cada uma marcada como "Parcela X de {Math.max(2, Math.round(numeroParcelas) || 2)}".
                  </p>
                </div>
              )}
            </div>
          )}

          {!multiplas && !clientMode && (
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  {billing && <SelectItem value="cancelado">Cancelado</SelectItem>}
                </SelectContent>
              </Select>
              {form.status === "cancelado" && (
                <Textarea
                  value={form.motivo_cancelamento}
                  onChange={(e) => setForm((f) => ({ ...f, motivo_cancelamento: e.target.value }))}
                  className="mt-2 bg-secondary border-border"
                  placeholder="Motivo do cancelamento (obrigatório) — ex: substituída por registros individuais"
                  rows={2}
                />
              )}
            </div>
          )}
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {billing
                ? "Salvar"
                : multiplas
                ? `Criar ${despesasExtra.filter((l) => l.descricao.trim() && Number(l.valor) > 0).length} Cobranças`
                : parcelar
                ? `Criar ${Math.max(2, Math.round(numeroParcelas) || 2)} Parcelas`
                : "Criar Cobrança"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}