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
import { Camera, Loader2, Sparkles, CheckCircle2, ImageIcon, X } from "lucide-react";

const defaultForm = {
  client_id: "",
  client_nome: "",
  proposal_id: "",
  categoria: "outros",
  descricao: "",
  fornecedor: "",
  valor: "",
  data_despesa: "",
  comprovante_url: "",
  origem: "manual",
};

const CATEGORIAS = [
  { value: "imovel", label: "Imóvel" },
  { value: "equipe", label: "Equipe/Pessoal" },
  { value: "transporte", label: "Transporte" },
  { value: "outros", label: "Outros" },
];

export default function ExpenseFormDialog({ open, onOpenChange, expense, defaultClientId }) {
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [aiFilled, setAiFilled] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  useEffect(() => {
    if (expense) {
      setForm({
        client_id: expense.client_id || "",
        client_nome: expense.client_nome || "",
        proposal_id: expense.proposal_id || "",
        categoria: expense.categoria || "outros",
        descricao: expense.descricao || "",
        fornecedor: expense.fornecedor || "",
        valor: expense.valor || "",
        data_despesa: expense.data_despesa || "",
        comprovante_url: expense.comprovante_url || "",
        origem: expense.origem || "manual",
      });
      setAiFilled(expense.origem === "ia_nota_fiscal");
    } else {
      setForm({ ...defaultForm, client_id: defaultClientId || "" });
      setAiFilled(false);
    }
    setUploadError("");
  }, [expense, open, defaultClientId]);

  const mutation = useMutation({
    mutationFn: (data) =>
      expense
        ? base44.entities.Expense.update(expense.id, data)
        : base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onOpenChange(false);
    },
  });

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({ ...f, client_id: clientId, client_nome: client?.nome || "" }));
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, comprovante_url: file_url }));

      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            fornecedor: { type: "string", description: "Nome do fornecedor, loja, prestador ou pessoa que recebeu o pagamento" },
            valor: { type: "number", description: "Valor total da nota fiscal ou recibo" },
            data_despesa: { type: "string", format: "date", description: "Data da compra ou pagamento (YYYY-MM-DD)" },
            categoria_sugerida: { type: "string", enum: ["imovel", "equipe", "transporte", "outros"], description: "Categoria mais provável: imovel (aluguel de casa/imóvel), equipe (pagamento a pessoas/prestadores de serviço), transporte (carro, van, transfer, combustível), outros" },
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
        categoria: data.categoria_sugerida || f.categoria,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ ...form, valor: form.valor ? Number(form.valor) : 0 });
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
            <p className="text-[11px] text-muted-foreground text-center mt-1">A IA preenche fornecedor, valor, data e categoria automaticamente</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Cliente / Evento</Label>
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
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} className="mt-1.5 bg-secondary border-border" required />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Data</Label>
              <Input type="date" value={form.data_despesa} onChange={(e) => setForm((f) => ({ ...f, data_despesa: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" disabled={mutation.isPending || uploading}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {expense ? "Salvar" : "Lançar Despesa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
