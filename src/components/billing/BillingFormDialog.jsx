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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage, translateCategoria } from "@/lib/i18n";
import { Camera, Loader2, ImageIcon, X, Sparkles } from "lucide-react";

const defaultForm = { client_id: "", client_nome: "", descricao: "", categoria: "", valor: "", status: "pendente", data_vencimento: "", comprovante_url: "" };

const CATEGORIAS_BASE = ["Pacote Principal", "Contas a Pagar", "Reserva Financeira"];
const NEW_CATEGORY_VALUE = "__nova__";

function normalize(str) {
  return (str || "").trim().toLowerCase();
}

export default function BillingFormDialog({ open, onOpenChange, billing }) {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState(defaultForm);
  const [creatingCategoria, setCreatingCategoria] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [aiFilled, setAiFilled] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
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
        descricao: billing.descricao || "",
        categoria: billing.categoria || "",
        valor: billing.valor || "",
        status: billing.status || "pendente",
        data_vencimento: billing.data_vencimento || "",
        comprovante_url: billing.comprovante_url || "",
      });
    } else {
      setForm(defaultForm);
    }
    setCreatingCategoria(false);
    setNovaCategoria("");
    setUploadError("");
    setAiFilled(false);
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