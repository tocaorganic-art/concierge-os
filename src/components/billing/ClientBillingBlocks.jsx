import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Paperclip, Camera, ChevronDown } from "lucide-react";
import { statusDerivado } from "@/lib/finance";

// Blocos de UI compartilhados entre a Faturamento do cliente (dentro do
// dashboard único, Billing.jsx) e o portal antigo (ClientFinanceiro.jsx,
// ainda não removido) — extraído para não duplicar/desalinhar a mesma
// lógica em dois arquivos.

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export const STATUS_LABEL = {
  pendente: { label: "Pendente", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  parcialmente_recebido: { label: "Parcial", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  recebido: { label: "Pago", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  atrasado: { label: "Atrasado", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
};

// Permite ao cliente anexar seu próprio comprovante de pagamento a uma
// parcela pendente/parcial — só grava comprovante_url (RLS de campo em
// base44/entities/Billing.jsonc), nunca altera valor, status ou natureza.
export function AnexarComprovante({ billing, onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [divergencia, setDivergencia] = useState(null);

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setDivergencia(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Billing.update(billing.id, { comprovante_url: file_url, ultima_edicao_por: "cliente" });
      try {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: { type: "object", properties: { valor: { type: "number", description: "Valor total pago, conforme o comprovante" } } },
        });
        const data = extracted?.output || extracted || {};
        if (data.valor && billing.valor && Math.abs(data.valor - billing.valor) > 0.5) {
          setDivergencia({ lido: data.valor, esperado: billing.valor });
        }
      } catch {
        // sem problema, só não confere automaticamente
      }
      onUploaded();
    } catch {
      setError("Não consegui enviar. Tente novamente.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mt-0.5">
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={handleFileSelected} />
      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-60">
        {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />}
        {uploading ? "Lendo com IA..." : "Anexar comprovante de pagamento"}
      </button>
      {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      {divergencia && (
        <p className="text-[10px] text-amber-400 mt-0.5">
          O comprovante mostra R$ {divergencia.lido.toLocaleString("pt-BR")}, mas essa cobrança é de R$ {divergencia.esperado.toLocaleString("pt-BR")} — enviado mesmo assim, a equipe vai conferir.
        </p>
      )}
    </div>
  );
}

// Uma linha de cobrança clicável — expande para mostrar o histórico de
// recebimentos e comprovantes daquela cobrança especificamente.
export function LinhaParcela({ billing, recebimentos, onUploaded }) {
  const [aberto, setAberto] = useState(false);
  const recebimentosDaParcela = recebimentos.filter((r) => r.billing_id === billing.id);
  const status = statusDerivado(billing, recebimentos);
  const meta = STATUS_LABEL[status] || STATUS_LABEL.pendente;
  const podeAnexar = status !== "recebido" && status !== "cancelado" && !billing.comprovante_url;

  return (
    <div className="border-b border-border/60 last:border-0 py-2.5">
      <button type="button" onClick={() => setAberto((a) => !a)} className="w-full flex items-start justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="text-sm text-foreground">
            {billing.numero_parcela && billing.total_parcelas ? `Parcela ${billing.numero_parcela}/${billing.total_parcelas}` : billing.descricao || "Cobrança"}
          </p>
          <p className="text-[11px] text-muted-foreground">Venc. {formatDate(billing.data_vencimento)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-display font-semibold text-primary">R$ {(billing.valor || 0).toLocaleString("pt-BR")}</span>
          <span className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${meta.className}`}>{meta.label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
        </div>
      </button>
      {aberto && (
        <div className="mt-2 pl-1 space-y-1.5">
          {recebimentosDaParcela.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum recebimento lançado ainda.</p>
          ) : (
            recebimentosDaParcela.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-[11px]">
                <span className={r.valor < 0 ? "text-red-400" : "text-muted-foreground"}>
                  {r.estorno_de_id ? "Estorno" : "Recebido"} em {formatDate(r.data_recebimento)}{r.metodo ? ` · ${r.metodo}` : ""}
                </span>
                <span className={r.valor < 0 ? "text-red-400 font-mono" : "text-emerald-400 font-mono"}>R$ {r.valor.toLocaleString("pt-BR")}</span>
              </div>
            ))
          )}
          {billing.comprovante_url && (
            <a href={billing.comprovante_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
              <Paperclip className="w-2.5 h-2.5" /> Ver comprovante
            </a>
          )}
          {podeAnexar && <AnexarComprovante billing={billing} onUploaded={onUploaded} />}
        </div>
      )}
    </div>
  );
}
