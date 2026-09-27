import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import PixPaymentCard from "@/components/billing/PixPaymentCard";
import { useLanguage, translateCategoria } from "@/lib/i18n";
import {
  Loader2, Receipt, CheckCircle2, Clock, AlertTriangle, Paperclip, Camera,
  Wallet, Home, Users, Car, ShoppingBag, MoreHorizontal,
} from "lucide-react";

const STATUS_PAGAMENTO = {
  pendente: { label: "Pendente", icon: Clock, className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  recebido: { label: "Pago", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  atrasado: { label: "Atrasado", icon: AlertTriangle, className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

// Mesmo mapeamento de ícone por categoria usado no painel interno
// (src/pages/Despesas.jsx) — mantém consistência visual entre o que a
// equipe vê e o que o cliente vê no extrato de custos.
function normalizeCat(str) {
  return (str || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
}
const CATEGORY_META = {
  imovel: { icon: Home, className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  equipepessoal: { icon: Users, className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  equipe: { icon: Users, className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  transporte: { icon: Car, className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  compras: { icon: ShoppingBag, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  outros: { icon: MoreHorizontal, className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
};
const DEFAULT_CATEGORY_META = { icon: MoreHorizontal, className: "bg-purple-500/15 text-purple-400 border-purple-500/20" };
function getCategoryMeta(cat) {
  return CATEGORY_META[normalizeCat(cat)] || DEFAULT_CATEGORY_META;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

// Permite ao cliente anexar seu próprio comprovante de pagamento a uma cobrança
// pendente/atrasada — só grava o campo comprovante_url (RLS de campo em
// base44/entities/Billing.jsonc), nunca altera valor, status ou qualquer outro
// dado da cobrança.
function AnexarComprovante({ billing, onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Billing.update(billing.id, { comprovante_url: file_url });
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-60"
      >
        {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />}
        {uploading ? "Enviando..." : "Anexar comprovante de pagamento"}
      </button>
      {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

// Aba Financeiro do Portal do Cliente — modelo "Open Book" (ver
// docs/OPEN_BOOK_PORTAL_FINANCEIRO.md): duas seções, Pagamentos (parcelas/
// cobranças, Billing) e Extrato de Custos (cada item pago a fornecedores,
// Expense, com categoria, valor real e comprovante — nunca a margem do
// admin, protegida por RLS de campo em base44/entities/Expense.jsonc).
export default function ClientFinanceiro() {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingProfile } = useUserProfile();
  const clientId = user?.client_id;

  const { data: meusPagamentos = [], isLoading: isLoadingBilling } = useQuery({
    queryKey: ["my_billing", clientId],
    queryFn: () => base44.entities.Billing.filter({ client_id: clientId }, "data_vencimento", 50),
    enabled: Boolean(clientId),
  });

  const { data: minhasDespesas = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["my_expenses", clientId],
    queryFn: () => base44.entities.Expense.filter({ client_id: clientId }, "-data_despesa", 100),
    enabled: Boolean(clientId),
  });

  const totalCobrado = meusPagamentos.reduce((sum, b) => sum + (b.valor || 0), 0);
  const totalPago = meusPagamentos.filter((b) => b.status === "recebido").reduce((sum, b) => sum + (b.valor || 0), 0);
  const saldoPendente = totalCobrado - totalPago;
  const pctPago = totalCobrado > 0 ? Math.round((totalPago / totalCobrado) * 100) : 0;

  const temContasAPagarPendente = meusPagamentos.some(
    (b) => (b.categoria || "").trim().toLowerCase() === "contas a pagar" && b.status !== "recebido"
  );

  // Valor exibido por item de custo: o que o cliente efetivamente deve ver é o
  // valor_cobrado_cliente quando há markup; sem markup, o custo real (valor) é
  // o próprio valor repassado — é assim que o time já lança hoje (sem esconder
  // nada do cliente, só a margem/comissão fica de fora).
  const valorExibivel = (e) => (e.valor_cobrado_cliente ?? e.valor) || 0;
  const totalCustos = minhasDespesas.reduce((sum, e) => sum + valorExibivel(e), 0);

  const isLoading = isLoadingProfile || isLoadingBilling || isLoadingExpenses;

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

      {/* Pagamentos */}
      {meusPagamentos.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              <Receipt className="w-3.5 h-3.5" /> Pagamentos
            </div>
            <span className="text-[11px] text-muted-foreground">
              R$ {totalPago.toLocaleString("pt-BR")} de R$ {totalCobrado.toLocaleString("pt-BR")} pago
            </span>
          </div>

          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-2">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(pctPago, 100)}%` }} />
          </div>

          {saldoPendente > 0 && (
            <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs text-amber-400 font-medium">Saldo pendente</span>
              <span className="font-display font-bold text-amber-400">R$ {saldoPendente.toLocaleString("pt-BR")}</span>
            </div>
          )}

          <div className="space-y-2">
            {meusPagamentos.map((b) => {
              const meta = STATUS_PAGAMENTO[b.status] || STATUS_PAGAMENTO.pendente;
              const StatusIcon = meta.icon;
              const podeAnexar = b.status !== "recebido" && !b.comprovante_url;
              return (
                <div key={b.id} className="flex items-start justify-between text-sm gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground">{b.descricao || "Parcela"}</p>
                    <p className="text-[11px] text-muted-foreground">Venc. {formatDate(b.data_vencimento)}</p>
                    {b.comprovante_url && (
                      <a href={b.comprovante_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5">
                        <Paperclip className="w-2.5 h-2.5" /> Comprovante
                      </a>
                    )}
                    {podeAnexar && (
                      <AnexarComprovante
                        billing={b}
                        onUploaded={() => queryClient.invalidateQueries({ queryKey: ["my_billing", clientId] })}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-display font-semibold text-primary">R$ {(b.valor || 0).toLocaleString("pt-BR")}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${meta.className}`}>
                      <StatusIcon className="w-2.5 h-2.5" /> {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extrato de Custos — Open Book */}
      {minhasDespesas.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" /> Extrato de custos
            </div>
            <span className="text-[11px] text-muted-foreground">
              R$ {totalCustos.toLocaleString("pt-BR")} gastos até agora
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Cada conta que pagamos por você — fornecedor, valor e comprovante.
          </p>
          <div className="space-y-3">
            {minhasDespesas.map((e) => {
              const catMeta = getCategoryMeta(e.categoria);
              const CatIcon = catMeta.icon;
              return (
                <div key={e.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${catMeta.className}`}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground">{e.fornecedor || e.descricao || "Item"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {translateCategoria(e.categoria, lang)} · {formatDate(e.data_despesa)}
                      </p>
                      {e.comprovante_url && (
                        <a href={e.comprovante_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5">
                          <Paperclip className="w-2.5 h-2.5" /> Comprovante / contrato
                        </a>
                      )}
                    </div>
                  </div>
                  <span className="font-display font-semibold text-foreground flex-shrink-0">
                    R$ {valorExibivel(e).toLocaleString("pt-BR")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Forma de pagamento */}
      {temContasAPagarPendente && <PixPaymentCard />}

      {meusPagamentos.length === 0 && minhasDespesas.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">Nenhum lançamento financeiro ainda.</p>
      )}
    </div>
  );
}
