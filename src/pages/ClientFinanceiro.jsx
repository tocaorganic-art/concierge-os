import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import PixPaymentCard from "@/components/billing/PixPaymentCard";
import { useLanguage, translateCategoria } from "@/lib/i18n";
import {
  Loader2, Receipt, Paperclip, Camera, ChevronDown,
  Wallet, Home, Users, Car, ShoppingBag, MoreHorizontal, Crown,
} from "lucide-react";
import { saldoDevedor, valorRecebido, statusDerivado } from "@/lib/finance";

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
// e o PR que introduziu Recebimento/natureza). Dois blocos, somente
// leitura, só os dados do próprio cliente (RLS no backend, não só no front):
// 1. Honorário de concierge (Billing com natureza="honorario")
// 2. Custos da operação / repasses (Expense — fornecedor, categoria, comprovante)
export default function ClientFinanceiro() {
  const { lang } = useLanguage();
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

  const { data: minhasDespesasRaw = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["my_expenses", clientId],
    queryFn: () => base44.entities.Expense.filter({ client_id: clientId }, "-data_despesa", 100),
    enabled: Boolean(clientId),
  });

  // Itens com valor zerado são notas internas de reconciliação contábil —
  // não representam gasto real e não devem aparecer no extrato do cliente.
  const minhasDespesas = minhasDespesasRaw.filter((e) => (e.valor || 0) > 0 || (e.valor_cobrado_cliente || 0) > 0);

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
  const totalPagoHonorario = honorarios.reduce((sum, b) => sum + valorRecebido(b.id, meusRecebimentos), 0);
  const saldoHonorario = honorarios.reduce((sum, b) => sum + Math.max(0, saldoDevedor(b, meusRecebimentos)), 0);
  const proximoVencimento = honorarios
    .filter((b) => statusDerivado(b, meusRecebimentos) !== "recebido" && statusDerivado(b, meusRecebimentos) !== "cancelado")
    .map((b) => b.data_vencimento)
    .filter(Boolean)
    .sort()[0];

  const valorExibivel = (e) => (e.valor_cobrado_cliente ?? e.valor) || 0;
  const totalCustos = minhasDespesas.reduce((sum, e) => sum + valorExibivel(e), 0);

  const temContasAPagarPendente = meusBillings.some(
    (b) => (b.categoria || "").trim().toLowerCase() === "contas a pagar" && statusDerivado(b, meusRecebimentos) !== "recebido"
  );

  const isLoading = isLoadingProfile || isLoadingBilling || isLoadingRecebimentos || isLoadingExpenses;

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

      {/* Bloco 2 — Custos da operação (repasses) */}
      {minhasDespesas.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" /> Custos da Operação
            </div>
            <span className="text-[11px] text-muted-foreground">R$ {totalCustos.toLocaleString("pt-BR")}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Cada conta que pagamos por você — fornecedor, categoria, valor e comprovante.
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
                      <p className="text-[11px] text-muted-foreground">{translateCategoria(e.categoria, lang)} · {formatDate(e.data_despesa)}</p>
                      {e.comprovante_url && (
                        <a href={e.comprovante_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5">
                          <Paperclip className="w-2.5 h-2.5" /> Comprovante / contrato
                        </a>
                      )}
                    </div>
                  </div>
                  <span className="font-display font-semibold text-foreground flex-shrink-0">R$ {valorExibivel(e).toLocaleString("pt-BR")}</span>
                </div>
              );
            })}
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

      {honorarios.length === 0 && minhasDespesas.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">Nenhum lançamento financeiro ainda.</p>
      )}
    </div>
  );
}
