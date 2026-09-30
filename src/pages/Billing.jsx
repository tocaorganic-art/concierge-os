import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Receipt, DollarSign, AlertCircle, CheckCircle2, Wallet, Paperclip, TrendingUp, FileSpreadsheet } from "lucide-react";
import { useLanguage, translateCategoria } from "@/lib/i18n";
import { formatBRL } from "@/lib/formatBRL";
import { useToast } from "@/components/ui/use-toast";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
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
  statusDerivado, saldoDevedor, valorRecebido, agruparBillingsCliente,
  receitaCaixaDoMes, totalAReceber, emAtraso, indiceRecebimento,
  comprovantesDoBilling, ultimoComprovante,
} from "@/lib/finance";

// Faturamento de uma conta "cliente" — billings/recebimentos já filtrados
// pelo componente pai (por RLS para um cliente real, ou explicitamente por
// effectiveClientId no modo "ver como cliente") — agrupados nos 3 blocos
// que fazem sentido pro cliente: Seu Contrato, Serviços Adicionais e
// Caução (nunca contratos/custos de fornecedor — RLS já bloqueia isso na
// origem, não é só UI escondendo).
function FaturamentoCliente({ billings, recebimentos, effectiveClientId, focusStatus, focusTipo }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editBilling, setEditBilling] = useState(null);

  const { data: proposals = [] } = useQuery({
    queryKey: ["my_proposals", effectiveClientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: effectiveClientId }, "-created_date", 5),
    enabled: Boolean(effectiveClientId),
  });
  const formaPagamento = proposals?.[0]?.forma_pagamento_preferida;
  const chavePixContrato = proposals?.[0]?.chave_pix_recebimento || "";

  const { contrato, adicionais, caucao } = agruparBillingsCliente(billings);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["billings"] });

  // Vindo de um KPI clicável da Visão Geral (?status=... ou ?tipo=caucao) —
  // acha o primeiro registro que bate e rola/abre ele automaticamente, pra
  // "abrir o Financeiro já filtrado" mesmo sem um filtro de lista aqui
  // (a tela do cliente é agrupada em blocos, não em lista filtrável).
  const todasAtivas = [...contrato, ...adicionais, ...caucao];
  const alvoId = React.useMemo(() => {
    if (focusTipo === "caucao") return caucao[0]?.id;
    if (!focusStatus) return null;
    if (focusStatus === "aberto") {
      return todasAtivas.find((b) => saldoDevedor(b, recebimentos) > 0)?.id;
    }
    return todasAtivas.find((b) => statusDerivado(b, recebimentos) === focusStatus)?.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStatus, focusTipo, billings]);

  useEffect(() => {
    if (!alvoId) return;
    const el = document.getElementById(`billing-${alvoId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [alvoId]);

  const Bloco = ({ titulo, itens, destacar, subtitulo }) =>
    itens.length > 0 && (
      <div className={`bg-card border rounded-2xl p-5 mb-6 ${destacar ? "border-primary/50 ring-1 ring-primary/30" : "border-border"}`}>
        <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
          <Receipt className="w-3.5 h-3.5" /> {titulo}
        </div>
        {subtitulo && <p className="text-[11px] text-muted-foreground mb-2">{subtitulo}</p>}
        <div>
          {itens.map((b) => (
            <LinhaParcela key={b.id} billing={b} recebimentos={recebimentos} onUploaded={invalidate} onEdit={(x) => { setEditBilling(x); setShowForm(true); }} defaultAberto={b.id === alvoId} />
          ))}
        </div>
        {/* Total da categoria — soma dos valores das cobranças deste bloco,
            com quebra automática por tipo de despesa (Fixa / Variável). */}
        <div className="flex items-center justify-between gap-2 pt-3 mt-1 border-t border-border/60">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {t("billing_block_total_label")} ({itens.length} {itens.length === 1 ? t("common_lancamento_singular") : t("common_lancamento_plural")})
          </span>
          <span className="font-display font-semibold text-primary text-lg">
            {formatBRL(itens.reduce((sum, b) => sum + (b.valor || 0), 0))}
          </span>
        </div>
        {(() => {
          const fixa = itens.filter((b) => b.tipo_despesa === "fixa").reduce((sum, b) => sum + (b.valor || 0), 0);
          const variavel = itens.filter((b) => b.tipo_despesa === "variavel").reduce((sum, b) => sum + (b.valor || 0), 0);
          if (fixa === 0 && variavel === 0) return null;
          return (
            <div className="flex items-center justify-end gap-3 mt-1 text-[11px] font-mono text-muted-foreground">
              {fixa > 0 && <span>Fixa {formatBRL(fixa)}</span>}
              {variavel > 0 && <span>Variável {formatBRL(variavel)}</span>}
            </div>
          );
        })()}
      </div>
    );

  const temAdicionaisAberto = adicionais.some((b) => statusDerivado(b, recebimentos) !== "recebido");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {t("billing_client_legend")}
        </p>
        <Button size="sm" onClick={() => { setEditBilling(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
          <Plus className="w-3.5 h-3.5" /> {t("billing_new_charge_client")}
        </Button>
      </div>
      <Bloco titulo={t("billing_block_contrato_title")} itens={contrato} subtitulo={t("billing_block_contrato_sub")} />
      <Bloco titulo={t("billing_block_adicionais_title")} itens={adicionais} subtitulo={t("billing_block_adicionais_sub")} />
      <Bloco titulo={t("billing_block_caucao_title")} itens={caucao} destacar={focusTipo === "caucao"} />
      {temAdicionaisAberto && <PixPaymentCard formaPagamento={formaPagamento} chavePixContrato={chavePixContrato} />}
      {contrato.length === 0 && adicionais.length === 0 && caucao.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">{t("billing_empty_client")}</p>
      )}
      <BillingFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        billing={editBilling}
        clientMode
        fixedClient={{ id: effectiveClientId, nome: billings[0]?.client_nome || "" }}
      />
    </div>
  );
}

export default function Billing() {
  const { t, lang } = useLanguage();
  const { isClientMode, effectiveClientId } = useEffectiveRole();
  const [searchParams] = useSearchParams();
  const focusStatus = searchParams.get("status");
  const focusTipo = searchParams.get("tipo");
  const [showForm, setShowForm] = useState(false);
  const [editBilling, setEditBilling] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(focusStatus || "all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [recebimentoBilling, setRecebimentoBilling] = useState(null);
  const [estornoAlvo, setEstornoAlvo] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [exportando, setExportando] = useState(false);
  const { toast } = useToast();

  const exportarSheets = async () => {
    setExportando(true);
    try {
      const now = new Date();
      const res = await base44.functions.invoke("exportBillingToSheets", {
        mes: now.getMonth() + 1,
        ano: now.getFullYear(),
      });
      const data = res?.data ?? res;
      if (data?.status === "sem_dados") {
        toast({ title: "Nada para exportar", description: "Não há cobranças nem custos neste mês." });
      } else if (data?.spreadsheet_url) {
        window.open(data.spreadsheet_url, "_blank");
        toast({ title: "Planilha criada", description: "Faturamento e custos do mês exportados para o Google Sheets." });
      } else {
        throw new Error(data?.error || "Erro desconhecido.");
      }
    } catch (e) {
      toast({ title: "Erro ao exportar", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setExportando(false);
    }
  };

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
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "aberto" ? b.saldo > 0 && b.statusCalc !== "cancelado" : b.statusCalc === filterStatus);
      const matchCategoria = filterCategoria === "all" || b.categoria === filterCategoria;
      const matchTipo = !focusTipo || focusTipo !== "caucao" || b.natureza === "caucao";
      return matchSearch && matchStatus && matchCategoria && matchTipo;
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

  if (isClientMode) {
    // Para um cliente real, .list() já vem filtrado por RLS. Para o admin
    // "vendo como cliente", RLS não filtra nada (ele pode ler tudo) — o
    // filtro explícito por effectiveClientId é o que faz a visualização
    // ser só daquele cliente.
    const billingsCliente = billings.filter((b) => b.client_id === effectiveClientId);
    const recebimentosCliente = recebimentos.filter((r) => r.client_id === effectiveClientId);
    return (
      <div>
        <PageHeader title={t("billing_title")} subtitle={t("billing_subtitle")} />
        <FaturamentoCliente
          billings={billingsCliente}
          recebimentos={recebimentosCliente}
          effectiveClientId={effectiveClientId}
          focusStatus={focusStatus}
          focusTipo={focusTipo}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("billing_title")}
        subtitle={t("billing_subtitle")}
        action={
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" onClick={exportarSheets} disabled={exportando} className="gap-2 border-border bg-secondary hover:bg-accent">
              <FileSpreadsheet className="w-4 h-4" /> {exportando ? "Exportando..." : "Exportar Sheets"}
            </Button>
            <Button onClick={() => { setEditBilling(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" /> {t("btn_new_charge")}
            </Button>
          </div>
        }
      />

      {/* Dados da empresa e forma de pagamento (Contas a Pagar) — referência rápida para copiar/enviar ao cliente */}
      <PixPaymentCard />

      {/* KPIs (fórmulas em src/lib/finance.js — mesma fonte do Dashboard e Relatórios) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <KpiCard title={t("billing_received_month")} value={formatBRL(thisMonthReceived)} icon={CheckCircle2} />
        <KpiCard title={t("billing_pending")} value={formatBRL(pendingTotal)} icon={DollarSign} />
        <KpiCard
          title={t("billing_overdue")}
          value={formatBRL(overdueTotal)}
          icon={AlertCircle}
          trendLabel={overdueCount > 0 ? `${overdueCount} cobrança${overdueCount > 1 ? "s" : ""}` : undefined}
        />
        <KpiCard title="Índice de Recebimento" value={indice === null ? "—" : `${indice}%`} icon={TrendingUp} />
        {categoriasDisponiveis.some((c) => c.trim().toLowerCase() === "reserva financeira") && (
          <KpiCard title={translateCategoria("Reserva Financeira", lang)} value={formatBRL(reservaFinanceira)} icon={Wallet} />
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
            <SelectItem value="aberto">Em aberto (não pago)</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aguardando_confirmacao">Aguardando confirmação</SelectItem>
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
                          {ultimoComprovante(b) && (
                            <a href={ultimoComprovante(b).url} target="_blank" rel="noopener noreferrer" title="Ver último comprovante" onClick={(e) => e.stopPropagation()} className="ml-2 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
                              <Paperclip className="w-3 h-3" /> Comprovante{comprovantesDoBilling(b).length > 1 ? ` (${comprovantesDoBilling(b).length})` : ""}
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
                          {formatBRL(b.saldo)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-display font-semibold text-sm text-primary">
                          {formatBRL(b.valor || 0)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary"
                              onClick={(e) => { e.stopPropagation(); setEditBilling(b); setShowForm(true); }}>
                              Editar
                            </Button>
                            {b.statusCalc !== "recebido" && b.statusCalc !== "cancelado" && (
                              <Button variant="ghost" size="sm" className="text-xs text-green-400 hover:text-green-300"
                                onClick={(e) => { e.stopPropagation(); setRecebimentoBilling(b); }}>
                                Registrar Recebimento
                              </Button>
                            )}
                          </div>
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
                                        {formatBRL(r.valor)}
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
                    {ultimoComprovante(b) && (
                      <a href={ultimoComprovante(b).url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
                        <Paperclip className="w-3 h-3" /> Comprovante{comprovantesDoBilling(b).length > 1 ? ` (${comprovantesDoBilling(b).length})` : ""}
                      </a>
                    )}
                  </div>
                  <StatusBadge status={b.statusCalc} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">Saldo / Vencimento</p>
                    <p className="text-sm text-foreground font-mono">
                      {formatBRL(b.saldo)} · {b.data_vencimento ? new Date(b.data_vencimento).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  <p className="font-display font-bold text-primary text-lg">
                    {formatBRL(b.valor || 0)}
                  </p>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setEditBilling(b); setShowForm(true); }}
                    className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    Editar
                  </button>
                  {b.statusCalc !== "recebido" && b.statusCalc !== "cancelado" && (
                    <button
                      onClick={() => setRecebimentoBilling(b)}
                      className="flex-1 py-2 rounded-lg border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/10 transition-colors"
                    >
                      Registrar Recebimento
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => { setEditBilling(null); setShowForm(true); }}
        className="fixed bottom-20 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
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