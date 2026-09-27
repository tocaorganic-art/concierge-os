import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Receipt, DollarSign, AlertCircle, CheckCircle2, Wallet, Paperclip, TrendingUp } from "lucide-react";
import { useLanguage, translateCategoria } from "@/lib/i18n";
import { useUserProfile } from "@/lib/useUserProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import KpiCard from "@/components/shared/KpiCard";
import BillingFormDialog from "@/components/billing/BillingFormDialog";
import PixPaymentCard from "@/components/billing/PixPaymentCard";
import RegistrarRecebimentoDialog, { EstornarRecebimentoDialog } from "@/components/billing/RegistrarRecebimentoDialog";
import { LinhaParcela } from "@/components/billing/ClientBillingBlocks";
import { getClientColor } from "@/lib/clientColor";
import {
  statusDerivado, saldoDevedor, valorRecebido,
  receitaCaixaDoMes, totalAReceber, emAtraso, indiceRecebimento,
} from "@/lib/finance";

// Faturamento de uma conta "cliente" — mesmas queries do admin (billings,
// recebimentos já vêm escopados pelo backend via RLS), mas agrupadas nos 3
// blocos que fazem sentido pro cliente: Seu Contrato, Serviços Adicionais e
// Caução (nunca contratos/custos de fornecedor — RLS já bloqueia isso na
// origem, não é só UI escondendo).
function FaturamentoCliente({ billings, recebimentos }) {
  const queryClient = useQueryClient();
  const { user } = useUserProfile();
  const clientId = user?.client_id;

  const { data: proposals = [] } = useQuery({
    queryKey: ["my_proposals", clientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: clientId }, "-created_date", 5),
    enabled: Boolean(clientId),
  });
  const formaPagamento = proposals?.[0]?.forma_pagamento_preferida;
  const chavePixContrato = proposals?.[0]?.chave_pix_recebimento || "";

  const ativos = billings.filter((b) => b.status !== "cancelado");
  const caucao = ativos.filter((b) => b.natureza === "caucao");
  const adicionais = ativos.filter((b) => (b.categoria || "").trim().toLowerCase() === "contas a pagar");
  const contrato = ativos.filter((b) => !adicionais.includes(b) && !caucao.includes(b));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["billings"] });

  const Bloco = ({ titulo, itens }) =>
    itens.length > 0 && (
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
          <Receipt className="w-3.5 h-3.5" /> {titulo}
        </div>
        <div>
          {itens.map((b) => (
            <LinhaParcela key={b.id} billing={b} recebimentos={recebimentos} onUploaded={invalidate} />
          ))}
        </div>
      </div>
    );

  const temAdicionaisAberto = adicionais.some((b) => statusDerivado(b, recebimentos) !== "recebido");

  return (
    <div className="max-w-2xl">
      <Bloco titulo="Seu Contrato" itens={contrato} />
      <Bloco titulo="Serviços Adicionais" itens={adicionais} />
      <Bloco titulo="Caução (devolvível)" itens={caucao} />
      {temAdicionaisAberto && <PixPaymentCard formaPagamento={formaPagamento} chavePixContrato={chavePixContrato} />}
      {contrato.length === 0 && adicionais.length === 0 && caucao.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">Nenhum lançamento financeiro ainda.</p>
      )}
    </div>
  );
}

export default function Billing() {
  const { t, lang } = useLanguage();
  const { isClient } = useUserProfile();
  const [showForm, setShowForm] = useState(false);
  const [editBilling, setEditBilling] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [recebimentoBilling, setRecebimentoBilling] = useState(null);
  const [estornoAlvo, setEstornoAlvo] = useState(null);
  const [expandido, setExpandido] = useState(null);

  const { data: billings = [], isLoading } = useQuery({
    queryKey: ["billings"],
    queryFn: () => base44.entities.Billing.list("-created_date", 200),
  });

  const { data: recebimentos = [] } = useQuery({
    queryKey: ["recebimentos"],
    queryFn: () => base44.entities.Recebimento.list("-data_recebimento", 500),
  });

  // Status sempre derivado do saldo (src/lib/finance.js — regra R4), nunca
  // o campo bruto Billing.status (que só é escrito manualmente para
  // "cancelado").
  const filtered = billings
    .map((b) => ({ ...b, statusCalc: statusDerivado(b, recebimentos), saldo: saldoDevedor(b, recebimentos) }))
    .filter((b) => {
      const matchSearch = !search || b.client_nome?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || b.statusCalc === filterStatus;
      const matchCategoria = filterCategoria === "all" || b.categoria === filterCategoria;
      return matchSearch && matchStatus && matchCategoria;
    });

  const now = new Date();
  const thisMonthReceived = receitaCaixaDoMes(billings, recebimentos, now.getMonth() + 1, now.getFullYear());
  const pendingTotal = totalAReceber(billings, recebimentos);
  const { total: overdueTotal, quantidade: overdueCount } = emAtraso(billings, recebimentos);
  const indice = indiceRecebimento(billings, recebimentos);

  // Reserva Financeira = apenas crédito real (depósitos do cliente / saldo que sobrou), nunca cobrança a receber.
  const reservaFinanceira = billings
    .filter((b) => (b.categoria || "").trim().toLowerCase() === "reserva financeira")
    .reduce((sum, b) => sum + valorRecebido(b, recebimentos), 0);

  const categoriasDisponiveis = Array.from(
    new Set(billings.map((b) => b.categoria).filter(Boolean))
  ).sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isClient) {
    return (
      <div>
        <PageHeader title={t("billing_title")} subtitle={t("billing_subtitle")} />
        <FaturamentoCliente billings={billings} recebimentos={recebimentos} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("billing_title")}
        subtitle={t("billing_subtitle")}
        action={
          <Button onClick={() => { setEditBilling(null); setShowForm(true); }} className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> {t("btn_new_charge")}
          </Button>
        }
      />

      {/* Dados da empresa e forma de pagamento (Contas a Pagar) — referência rápida para copiar/enviar ao cliente */}
      <PixPaymentCard />

      {/* KPIs (fórmulas em src/lib/finance.js — mesma fonte do Dashboard e Relatórios) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <KpiCard title={t("billing_received_month")} value={`${t("currency_symbol")} ${thisMonthReceived.toLocaleString(t("locale_date"))}`} icon={CheckCircle2} />
        <KpiCard title={t("billing_pending")} value={`${t("currency_symbol")} ${pendingTotal.toLocaleString(t("locale_date"))}`} icon={DollarSign} />
        <KpiCard
          title={t("billing_overdue")}
          value={`${t("currency_symbol")} ${overdueTotal.toLocaleString(t("locale_date"))}`}
          icon={AlertCircle}
          trendLabel={overdueCount > 0 ? `${overdueCount} cobrança${overdueCount > 1 ? "s" : ""}` : undefined}
        />
        <KpiCard title="Índice de Recebimento" value={indice === null ? "—" : `${indice}%`} icon={TrendingUp} />
        {categoriasDisponiveis.some((c) => c.trim().toLowerCase() === "reserva financeira") && (
          <KpiCard title={translateCategoria("Reserva Financeira", lang)} value={`R$ ${reservaFinanceira.toLocaleString("pt-BR")}`} icon={Wallet} />
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        {categoriasDisponiveis.length > 0 && (
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-full sm:w-48 bg-secondary border-border"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categoriasDisponiveis.map((c) => (
                <SelectItem key={c} value={c}>{translateCategoria(c, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40 bg-secondary border-border"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="parcialmente_recebido">Parcial</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {billings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium mb-1">{t("billing_no_charges")}</p>
            <p className="text-muted-foreground text-sm">{t("billing_no_charges_desc")}</p>
          </div>
          <Button onClick={() => { setEditBilling(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> {t("btn_new_charge")}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title={t("billing_no_charges_filtered")} description={t("billing_adjust_filters")} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_client")}</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_description")}</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Natureza</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_due_date")}</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_status")}</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Saldo</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_value")}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const recebimentosDaCobranca = recebimentos.filter((r) => r.billing_id === b.id);
                  const isExpandido = expandido === b.id;
                  return (
                    <React.Fragment key={b.id}>
                      <tr
                        className="border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
                        style={b.ultima_edicao_por === "cliente" ? { borderLeft: `3px solid ${getClientColor(b.client_id)}` } : undefined}
                        onClick={() => setExpandido(isExpandido ? null : b.id)}
                      >
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{b.client_nome}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {b.descricao || "—"}
                          {b.categoria && (
                            <span className="ml-2 inline-flex items-center text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
                              {translateCategoria(b.categoria, lang)}
                            </span>
                          )}
                          {b.comprovante_url && (
                            <a href={b.comprovante_url} target="_blank" rel="noopener noreferrer" title="Ver comprovante" onClick={(e) => e.stopPropagation()} className="ml-2 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
                              <Paperclip className="w-3 h-3" /> Comprovante
                            </a>
                          )}
                          {b.ultima_edicao_por === "cliente" && (
                            <span
                              className="ml-2 inline-flex items-center text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                              style={{ color: getClientColor(b.client_id), borderColor: getClientColor(b.client_id), backgroundColor: `${getClientColor(b.client_id)}1a` }}
                            >
                              Editado pelo cliente
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono uppercase text-muted-foreground">
                          {b.natureza === "honorario" ? "Honorário" : b.natureza === "repasse" ? "Repasse" : "A classificar"}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">
                          {b.data_vencimento ? new Date(b.data_vencimento).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={b.statusCalc} /></td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm text-muted-foreground">
                          R$ {b.saldo.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-3.5 text-right font-display font-semibold text-sm text-primary">
                          R$ {(b.valor || 0).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-3.5">
                          {b.statusCalc !== "recebido" && b.statusCalc !== "cancelado" && (
                            <Button variant="ghost" size="sm" className="text-xs text-green-400 hover:text-green-300"
                              onClick={(e) => { e.stopPropagation(); setRecebimentoBilling(b); }}>
                              Registrar Recebimento
                            </Button>
                          )}
                        </td>
                      </tr>
                      {isExpandido && (
                        <tr className="bg-secondary/20">
                          <td colSpan={8} className="px-5 py-3">
                            {recebimentosDaCobranca.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nenhum recebimento lançado ainda.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {recebimentosDaCobranca.map((r) => (
                                  <div key={r.id} className="flex items-center justify-between text-xs">
                                    <span className={r.valor < 0 ? "text-red-400" : "text-foreground"}>
                                      {r.estorno_de_id ? "Estorno" : "Recebido"} · {new Date(r.data_recebimento).toLocaleDateString("pt-BR")} · {r.metodo || "—"}
                                      {r.motivo_estorno && <span className="text-muted-foreground"> — {r.motivo_estorno}</span>}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className={`font-mono font-semibold ${r.valor < 0 ? "text-red-400" : "text-green-400"}`}>
                                        R$ {r.valor.toLocaleString("pt-BR")}
                                      </span>
                                      {r.valor > 0 && !recebimentosDaCobranca.some((x) => x.estorno_de_id === r.id) && (
                                        <button onClick={() => setEstornoAlvo(r)} className="text-muted-foreground hover:text-red-400 underline">
                                          estornar
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((b) => (
              <div key={b.id} className="bg-card border border-border rounded-xl p-4 gold-border-hover">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground text-sm">{b.client_nome}</p>
                    {b.descricao && <p className="text-xs text-muted-foreground mt-0.5">{b.descricao}</p>}
                    {b.categoria && (
                      <span className="inline-flex items-center text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20 mt-1">
                        {translateCategoria(b.categoria, lang)}
                      </span>
                    )}
                    {b.comprovante_url && (
                      <a href={b.comprovante_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
                        <Paperclip className="w-3 h-3" /> Comprovante
                      </a>
                    )}
                  </div>
                  <StatusBadge status={b.statusCalc} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">Saldo / Vencimento</p>
                    <p className="text-sm text-foreground font-mono">
                      R$ {b.saldo.toLocaleString("pt-BR")} · {b.data_vencimento ? new Date(b.data_vencimento).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  <p className="font-display font-bold text-primary text-lg">
                    R$ {(b.valor || 0).toLocaleString("pt-BR")}
                  </p>
                </div>
                {b.statusCalc !== "recebido" && b.statusCalc !== "cancelado" && (
                  <button
                    onClick={() => setRecebimentoBilling(b)}
                    className="mt-3 w-full py-2 rounded-lg border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/10 transition-colors"
                  >
                    Registrar Recebimento
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => { setEditBilling(null); setShowForm(true); }}
        className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="Nova Cobrança"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BillingFormDialog open={showForm} onOpenChange={setShowForm} billing={editBilling} />
      <RegistrarRecebimentoDialog
        open={!!recebimentoBilling}
        onOpenChange={(v) => { if (!v) setRecebimentoBilling(null); }}
        billing={recebimentoBilling}
        recebimentos={recebimentos}
      />
      <EstornarRecebimentoDialog
        open={!!estornoAlvo}
        onOpenChange={(v) => { if (!v) setEstornoAlvo(null); }}
        recebimento={estornoAlvo}
      />
    </div>
  );
}
