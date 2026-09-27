import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import PixPaymentCard from "@/components/billing/PixPaymentCard";
import {
  Loader2, Receipt, Paperclip, Camera, ChevronDown, Crown,
} from "lucide-react";
import { saldoDevedor, valorRecebido, statusDerivado } from "@/lib/finance";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_LABEL = {
  pendente: { label: "Pendente", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  parcialmente_recebido: { label: "Parcial", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  recebido: { label: "Pago", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  atrasado: { label: "Atrasado", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
};

// Permite ao cliente anexar seu próprio comprovante de pagamento a uma
// parcela pendente/parcial — só grava comprovante_url (RLS de campo em
// base44/entities/Billing.jsonc), nunca altera valor, status ou natureza.
function AnexarComprovante({ billing, onUploaded }) {
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

// Uma linha de parcela do honorário — clicável, expande para mostrar o
// histórico de recebimentos e comprovantes daquela parcela especificamente.
function LinhaParcela({ billing, recebimentos, onUploaded }) {
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

// Aba Financeiro do Portal do Cliente — modelo "Open Book" (regras
// universais de contabilidade gerencial, ver docs/OPEN_BOOK_PORTAL_FINANCEIRO.md
// e o PR que introduziu Recebimento/natureza). Somente leitura, só os dados
// do próprio cliente (RLS no backend, não só no front). Nunca mostra custo
// real, margem, alocação nem identidade de fornecedor — regra explícita do
// Tony (ver PR que removeu o bloco "Custos da Operação": expunha o nome do
// fornecedor real por trás de cada cobrança, mesmo mostrando só o valor
// cobrado do cliente).
export default function ClientFinanceiro() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingProfile } = useUserProfile();
  const clientId = user?.client_id;

  const { data: meusBillings = [], isLoading: isLoadingBilling } = useQuery({
    queryKey: ["my_billing", clientId],
    queryFn: () => base44.entities.Billing.filter({ client_id: clientId }, "numero_parcela", 50),
    enabled: Boolean(clientId),
  });

  const { data: meusRecebimentos = [], isLoading: isLoadingRecebimentos } = useQuery({
    queryKey: ["my_recebimentos", clientId],
    queryFn: () => base44.entities.Recebimento.filter({ client_id: clientId }, "-data_recebimento", 200),
    enabled: Boolean(clientId),
  });

  // Bloco 1 — Honorário de concierge: só cobranças classificadas como
  // natureza="honorario". Registros ainda "a_classificar" não entram aqui
  // até a equipe confirmar a natureza (ver relatório da migração).
  const honorarios = meusBillings.filter((b) => b.natureza === "honorario");

  // Cobranças de repasse/a_classificar ainda em aberto (ex.: "Contas a
  // Pagar" — aluguel de carro, som, etc.) continuam visíveis: são dinheiro
  // que o cliente ainda precisa pagar, não podem desaparecer da tela só
  // por não serem "honorário".
  const outrasCobrancasAbertas = meusBillings.filter(
    (b) => b.natureza !== "honorario" && statusDerivado(b, meusRecebimentos) !== "recebido" && statusDerivado(b, meusRecebimentos) !== "cancelado"
  );
  const totalContrato = honorarios.reduce((sum, b) => sum + (b.valor || 0), 0);
  const totalPagoHonorario = honorarios.reduce((sum, b) => sum + valorRecebido(b, meusRecebimentos), 0);
  const saldoHonorario = honorarios.reduce((sum, b) => sum + Math.max(0, saldoDevedor(b, meusRecebimentos)), 0);
  const proximoVencimento = honorarios
    .filter((b) => statusDerivado(b, meusRecebimentos) !== "recebido" && statusDerivado(b, meusRecebimentos) !== "cancelado")
    .map((b) => b.data_vencimento)
    .filter(Boolean)
    .sort()[0];

  const temContasAPagarPendente = meusBillings.some(
    (b) => (b.categoria || "").trim().toLowerCase() === "contas a pagar" && statusDerivado(b, meusRecebimentos) !== "recebido"
  );

  const isLoading = isLoadingProfile || isLoadingBilling || isLoadingRecebimentos;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="font-heading text-xl font-bold text-foreground mb-4">Financeiro</h1>

      {/* Bloco 1 — Honorário de concierge */}
      {honorarios.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
            <Crown className="w-3.5 h-3.5 text-primary" /> Honorário de Concierge
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Total contratado</p>
              <p className="font-display text-lg font-bold text-foreground">R$ {totalContrato.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Pago</p>
              <p className="font-display text-lg font-bold text-emerald-400">R$ {totalPagoHonorario.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Saldo</p>
              <p className="font-display text-lg font-bold text-amber-400">R$ {saldoHonorario.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Próximo vencimento</p>
              <p className="font-display text-lg font-bold text-foreground">{proximoVencimento ? formatDate(proximoVencimento) : "—"}</p>
            </div>
          </div>
          <div>
            {honorarios.map((b) => (
              <LinhaParcela
                key={b.id}
                billing={b}
                recebimentos={meusRecebimentos}
                onUploaded={() => { queryClient.invalidateQueries({ queryKey: ["my_billing", clientId] }); queryClient.invalidateQueries({ queryKey: ["my_recebimentos", clientId] }); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Outras cobranças em aberto (Contas a Pagar / repasse) */}
      {outrasCobrancasAbertas.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
            <Receipt className="w-3.5 h-3.5" /> Outras Cobranças em Aberto
          </div>
          <div>
            {outrasCobrancasAbertas.map((b) => (
              <LinhaParcela
                key={b.id}
                billing={b}
                recebimentos={meusRecebimentos}
                onUploaded={() => { queryClient.invalidateQueries({ queryKey: ["my_billing", clientId] }); queryClient.invalidateQueries({ queryKey: ["my_recebimentos", clientId] }); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rodapé consolidado */}
      {honorarios.length > 0 && (
        <div className="bg-secondary/40 border border-border rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Total do Contrato</p>
            <p className="font-display font-bold text-foreground">R$ {totalContrato.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Total Pago</p>
            <p className="font-display font-bold text-emerald-400">R$ {totalPagoHonorario.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Saldo Devedor</p>
            <p className="font-display font-bold text-amber-400">R$ {saldoHonorario.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Próximo Vencimento</p>
            <p className="font-display font-bold text-foreground">{proximoVencimento ? formatDate(proximoVencimento) : "—"}</p>
          </div>
        </div>
      )}

      {/* Como pagar */}
      {temContasAPagarPendente && <PixPaymentCard />}

      {honorarios.length === 0 && outrasCobrancasAbertas.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">Nenhum lançamento financeiro ainda.</p>
      )}
    </div>
  );
}
