import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Upload, X } from "lucide-react";
const TIPOS = [
  "Viagem de luxo", "Casamento", "Evento corporativo",
  "Experiência local", "Transfer VIP", "Personalizado",
];

const AiBadge = () => (
  <span className="inline-flex items-center gap-1 bg-primary/15 text-primary text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-primary/20 ml-2"><Sparkles className="w-2.5 h-2.5" /> IA</span>
);

export default function AIProposalModal({ open, onOpenChange, onGenerated }) {
  const [form, setForm] = useState({
    client_id: "", client_nome: "", destino: "", tipo_servico: "Viagem de luxo",
    budget: "", num_pessoas: "", data_chegada: "", data_saida: "", observacoes: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploadedRef, setUploadedRef] = useState("");
  const [uploadName, setUploadName] = useState("");
  const fileRef = useRef(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  const handleClientChange = (id) => {
    const c = clients.find((c) => c.id === id);
    setForm((f) => ({ ...f, client_id: id, client_nome: c?.nome || "" }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedRef(ev.target.result?.toString().slice(0, 2000) || "");
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!form.client_nome || !form.destino) return;
    setLoading(true);
    const res = await base44.functions.invoke("generateWithAI", {
      type: "proposal",
      payload: { ...form, referencia_estilo: uploadedRef },
    });
    setLoading(false);
    const result = res?.data?.result;
    if (result) {
      onGenerated({
        client_id: form.client_id,
        client_nome: form.client_nome,
        destino: form.destino,
        data_chegada: form.data_chegada,
        data_saida: form.data_saida,
        num_pax: Number(form.num_pessoas) || 0,
        valor: Number(form.budget) || 0,
        status: "proposta",
        servicos: result.servicos || "",
        observacoes: `${result.descricao || ""}\n\n${result.observacoes || ""}`,
        _ai_titulo: result.titulo,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center">
            Proposta Inteligente <AiBadge />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Cliente</Label>
            <Select value={form.client_id} onValueChange={handleClientChange}>
              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Destino / Projeto</Label>
              <Input value={form.destino} onChange={(e) => setForm(f => ({ ...f, destino: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Ex: Maldivas, Casamento SP" />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tipo de Serviço</Label>
              <Select value={form.tipo_servico} onValueChange={(v) => setForm(f => ({ ...f, tipo_servico: v }))}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Budget (R$)</Label>
              <Input type="number" value={form.budget} onChange={(e) => setForm(f => ({ ...f, budget: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Ex: 15000" />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Nº de Pessoas</Label>
              <Input type="number" value={form.num_pessoas} onChange={(e) => setForm(f => ({ ...f, num_pessoas: e.target.value }))} className="mt-1.5 bg-secondary border-border" placeholder="Ex: 2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Data Chegada</Label>
              <Input type="date" value={form.data_chegada} onChange={(e) => setForm(f => ({ ...f, data_chegada: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Data Saída</Label>
              <Input type="date" value={form.data_saida} onChange={(e) => setForm(f => ({ ...f, data_saida: e.target.value }))} className="mt-1.5 bg-secondary border-border" />
            </div>
          </div>

          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Observações livres</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))} className="mt-1.5 bg-secondary border-border" rows={2} placeholder="Preferências, restrições, estilo de viagem..." />
          </div>

          {/* Upload de referência */}
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Proposta de referência (PDF/DOCX) <span className="text-muted-foreground/50 normal-case font-sans text-[10px]">— opcional</span></Label>
            <div className="mt-1.5">
              {uploadName ? (
                <div className="flex items-center gap-2 bg-secondary border border-border rounded-md px-3 py-2">
                  <span className="text-xs text-foreground flex-1 truncate">{uploadName}</span>
                  <button onClick={() => { setUploadName(""); setUploadedRef(""); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 w-full border border-dashed border-border rounded-md px-3 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Fazer upload de arquivo de referência
                </button>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={loading || !form.client_nome || !form.destino} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Gerando..." : "Gerar Proposta com IA"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}