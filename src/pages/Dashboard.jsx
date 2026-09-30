import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, FileText, TrendingUp, Users, AlertCircle, AlertTriangle, Wallet, Percent, Eye, Palmtree, UtensilsCrossed, Gem, LifeBuoy } from "lucide-react";
import KpiCard from "@/components/shared/KpiCard";
import DashboardBannerHeader from "@/components/dashboard/DashboardBannerHeader";
import DashboardPipeline from "@/components/dashboard/DashboardPipeline";
import DashboardAgenda from "@/components/dashboard/DashboardAgenda";
import DashboardClients from "@/components/dashboard/DashboardClients";
import DashboardRevenueChart from "@/components/dashboard/DashboardRevenueChart";
import DashboardStatusViagem from "@/components/dashboard/DashboardStatusViagem";
import DashboardProximosEventos from "@/components/dashboard/DashboardProximosEventos";
import DashboardMeuGrupoResumo from "@/components/dashboard/DashboardMeuGrupoResumo";
import DashboardSeusPagamentos from "@/components/dashboard/DashboardSeusPagamentos";
import RequestModal from "@/components/concierge/RequestModal";
import { useLanguage, safeLocaleDate } from "@/lib/i18n";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import TaskNotifications from "@/components/dashboard/TaskNotifications";
import DeadlineAlerts from "@/components/dashboard/DeadlineAlerts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  receitaCaixaDoMesPorNatureza, receitaNaoClassificadaDoMes, faturadoCompetenciaDoMes, totalAReceber, totalAReceberClientes,
  emAtrasoTotal, repassesEmCustodia, taxaConversao, indiceRecebimento, caucaoEmCustodia,
  totalAPagarFornecedores, saldoDevedor, valorRecebido, agruparBillingsCliente,
} from "@/lib/finance";
import { formatBRL } from "@/lib/formatBRL";

function getTiposPedido(t) {
  return [
    { id: "experiencia", Icon: Palmtree, label: t("request_type_experiencia_label"), sub: t("request_type_experiencia_sub") },
    { id: "reserva", Icon: UtensilsCrossed, label: t("request_type_reserva_label"), sub: t("request_type_reserva_sub") },
    { id: "exclusivo", Icon: Gem, label: t("request_type_exclusivo_label"), sub: t("request_type_exclusivo_sub") },
    { id: "ajuda", Icon: LifeBuoy, label: t("request_type_ajuda_label"), sub: t("request_type_ajuda_sub") },
  ];
}

// Visão Geral de uma conta "cliente" (real ou "ver como cliente" do admin) —
// MESMO layout/componentes da Visão Geral do admin (grade 2x2 de KpiCard,
// cartões de seção no mesmo estilo), só trocando o conteúdo por que faz
// sentido pro cliente. Todo número vem de src/lib/finance.js (regra R8).
function DashboardCliente({ billings, recebimentos, proposals, tasks, hospedes, t, user }) {
  const [selectedTipo, setSelectedTipo] = useState(null);
  const queryClient = useQueryClient();
  const [proposalIdSelecionado, setProposalIdSelecionado] = useState(proposals?.[0]?.id || "");
  const proposta = proposals.find((p) => p.id === proposalIdSelecionado) || proposals[0];

  const localeDate = safeLocaleDate(t);
  const TIPOS_PEDIDO = getTiposPedido(t);

  const { contrato, adicionais, caucao } = agruparBillingsCliente(billings);
  const servicos = [...contrato, ...adicionais];

  const totalContratado = servicos.reduce((sum, b) => sum + (b.valor || 0), 0);
  const totalPago = servicos.reduce((sum, b) => sum + valorRecebido(b, recebimentos), 0);
  const totalAPagar = roundedSub(totalContratado, totalPago);
  const totalCaucao = caucao.reduce((sum, b) => sum + (b.valor || 0), 0);

  function roundedSub(a, b) { return Math.round((a - b) * 100) / 100; }

  const { total: emAtrasoValor, quantidade: emAtrasoQtd } = emAtrasoTotal(billings, recebimentos);

  const proximoVencimento = servicos
    .filter((b) => saldoDevedor(b, recebimentos) > 0)
    .map((b) => b.data_vencimento)
    .filter(Boolean)
    .sort()[0];
  const proximoVencimentoValor = servicos.find((b) => b.data_vencimento === proximoVencimento)?.valor;

  const pagosResumo = recebimentos.filter((r) => r.valor > 0);
  const dataUltimoPagamento = pagosResumo.map((r) => r.data_recebimento).sort().slice(-1)[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_requests"] });
      setSelectedTipo(null);
    },
  });

  return (
    <div>
      {proposals.length > 0 && (
        <div className="mb-4 md:mb-6">
          <Select value={proposalIdSelecionado} onValueChange={setProposalIdSelecionado}>
            <SelectTrigger className="w-full md:w-72 bg-secondary border-border">
              <SelectValue placeholder={t("dash_my_trip_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {proposals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.destino} · {p.data_chegada ? new Date(p.data_chegada + "T00:00:00").toLocaleDateString(localeDate) : ""}
                  {p.data_saida ? `–${new Date(p.data_saida + "T00:00:00").toLocaleDateString(localeDate, { day: "2-digit", month: "2-digit" })}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-1">
        <KpiCard
          title={t("dash_kpi_total_contratado")}
          value={formatBRL(totalContratado)}
          icon={FileText}
          to="/faturamento"
          trendLabel={`${t("common_contrato_label")} ${formatBRL(contrato.reduce((s, b) => s + (b.valor || 0), 0))} · ${t("common_adicionais_label")} ${formatBRL(adicionais.reduce((s, b) => s + (b.valor || 0), 0))}`}
        />
        <KpiCard
          title={t("dash_kpi_pago")}
          value={formatBRL(totalPago)}
          icon={DollarSign}
          valueClassName="text-emerald-400"
          to="/faturamento?status=recebido"
          trendLabel={dataUltimoPagamento ? `${pagosResumo.length} Pix · ${new Date(dataUltimoPagamento + "T00:00:00").toLocaleDateString(localeDate)}` : undefined}
        />
        <KpiCard
          title={t("dash_kpi_a_pagar")}
          value={formatBRL(totalAPagar)}
          icon={Wallet}
          valueClassName={totalAPagar > 0 ? "text-amber-400" : "text-emerald-400"}
          to="/faturamento?status=aberto"
          trendLabel={proximoVencimento ? `${t("common_prox_venc_label")} ${new Date(proximoVencimento + "T00:00:00").toLocaleDateString(localeDate)} · ${formatBRL(proximoVencimentoValor || 0)}` : undefined}
        />
        <KpiCard
          title={t("dash_kpi_caucao")}
          value={formatBRL(totalCaucao)}
          icon={Wallet}
          to="/faturamento?tipo=caucao"
          trendLabel={t("dash_caucao_trend")}
        />
      </div>
      {emAtrasoQtd > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-1">
          <KpiCard
            title={t("dash_kpi_em_atraso")}
            value={formatBRL(emAtrasoValor)}
            icon={AlertCircle}
            valueClassName="text-red-400"
            to="/faturamento?status=atrasado"
            trendLabel={`${emAtrasoQtd} ${emAtrasoQtd > 1 ? t("common_cobranca_plural") : t("common_cobranca_singular")}`}
          />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mb-6 md:mb-8">
        {t("dash_updated_at")} {new Date().toLocaleTimeString(localeDate, { hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="mb-4 md:mb-6">
        <DashboardStatusViagem proposta={proposta} podeEditar={user?.role === "admin"} />
      </div>

      <div className="bg-card border border-border rounded-xl p-5 gold-border-hover mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-foreground">{t("dash_ask_concierge")}</h3>
          <a href="tel:" className="text-xs font-mono uppercase tracking-wider text-red-400 border border-red-500/30 rounded-full px-2.5 py-1">{t("dash_sos")}</a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TIPOS_PEDIDO.map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => setSelectedTipo(tipo)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-secondary/30 hover:border-primary/40 transition-colors"
            >
              <tipo.Icon className="w-6 h-6 text-primary" />
              <span className="text-[11px] text-foreground text-center">{tipo.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="xl:col-span-2">
          <DashboardProximosEventos tasks={tasks} />
        </div>
        <DashboardMeuGrupoResumo hospedes={hospedes} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <div className="xl:col-span-2">
          <DashboardSeusPagamentos contrato={contrato} adicionais={adicionais} caucao={caucao} recebimentos={recebimentos} />
        </div>
      </div>

      {selectedTipo && (
        <RequestModal
          tipo={selectedTipo}
          user={user}
          onClose={() => setSelectedTipo(null)}
          onSubmit={(data) => createMutation.mutate({ ...data, client_id: user?.client_id })}
          isSubmitting={createMutation.isPending}
        />
      )}
    </div>
  );
}

// KPIs oficiais do Dashboard Admin — todos calculados via src/lib/finance.js
// (regra R8: fonte única, mesma usada em Faturamento, Relatórios e Portal).
// Por padrão somam TODOS os clientes juntos — com mais de um cliente ativo
// isso mistura contratos diferentes; o seletor abaixo filtra tudo por
// client_id antes de calcular qualquer KPI, e "Ver como cliente" troca pra
// visualização completa daquele cliente (mesmo layout que ele vê).
export default function Dashboard() {
  const { t, lang } = useLanguage();
  const { user } = useUserProfile();
  const { isClientMode, isRealClient, effectiveClientId, startViewAs } = useEffectiveRole();
  const [selectedClientId, setSelectedClientId] = useState("all");

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list("-created_date", 100),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 100),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-today"],
    queryFn: () => base44.entities.Task.list("-created_date", 50),
  });

  const { data: billings = [] } = useQuery({
    queryKey: ["billings-dashboard"],
    queryFn: () => base44.entities.Billing.list("-data_vencimento", 500),
  });

  const { data: recebimentos = [] } = useQuery({
    queryKey: ["recebimentos"],
    queryFn: () => base44.entities.Recebimento.list("-data_recebimento", 500),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-dashboard"],
    queryFn: () => base44.entities.Expense.list("-data_despesa", 500),
    enabled: !isClientMode,
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ["contas-pagar-dashboard"],
    queryFn: () => base44.entities.ContaPagar.list("-data_vencimento", 500),
    enabled: !isClientMode,
  });

  const { data: hospedes = [] } = useQuery({
    queryKey: ["my_hospedes_dashboard", effectiveClientId],
    queryFn: () => base44.entities.Hospede.filter({ client_id: effectiveClientId }, "nome", 50),
    enabled: isClientMode && Boolean(effectiveClientId),
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const localeDate = safeLocaleDate(t);

  if (isClientMode) {
    const billingsCliente = billings.filter((b) => b.client_id === effectiveClientId);
    const recebimentosCliente = recebimentos.filter((r) => r.client_id === effectiveClientId);
    const proposalsCliente = proposals.filter((p) => p.client_id === effectiveClientId);
    const tasksCliente = tasks.filter((tk) => tk.client_id === effectiveClientId);
    return (
      <div>
        <DashboardBannerHeader data={now.toLocaleDateString(localeDate, { weekday: "long", day: "numeric", month: "long" })} />
        <DashboardCliente
          billings={billingsCliente}
          recebimentos={recebimentosCliente}
          proposals={proposalsCliente}
          tasks={tasksCliente}
          hospedes={hospedes}
          t={t}
          user={user}
        />
      </div>
    );
  }

  // Filtra tudo pelo cliente selecionado antes de calcular qualquer KPI.
  // ContaPagar não tem client_id direto — filtra pelas propostas do cliente.
  const isFiltered = selectedClientId !== "all";
  const billingsF = isFiltered ? billings.filter((b) => b.client_id === selectedClientId) : billings;
  const recebimentosF = isFiltered ? recebimentos.filter((r) => r.client_id === selectedClientId) : recebimentos;
  const expensesF = isFiltered ? expenses.filter((e) => e.client_id === selectedClientId) : expenses;
  const proposalsF = isFiltered ? proposals.filter((p) => p.client_id === selectedClientId) : proposals;
  const tasksF = isFiltered ? tasks.filter((task) => task.client_id === selectedClientId) : tasks;
  const proposalIdsF = new Set(proposalsF.map((p) => p.id));
  const contasPagarF = isFiltered ? contasPagar.filter((c) => proposalIdsF.has(c.proposal_id)) : contasPagar;

  // KPI 1 e 2 — Receita própria (caixa, honorário + intermediação + comissão)
  // x Faturado (competência, por data de emissão/assinatura do contrato).
  const receitaMes = receitaCaixaDoMesPorNatureza(billingsF, recebimentosF, currentMonth, currentYear);
  const receitaNaoClassificada = receitaNaoClassificadaDoMes(billingsF, recebimentosF, currentMonth, currentYear);
  const faturadoMes = faturadoCompetenciaDoMes(billingsF, currentMonth, currentYear);

  // KPI 3 — dois cartões: o que o cliente deve no total x só a receita
  // própria do Tony dentro disso (ajuste 2 do pedido).
  const aReceberClientes = totalAReceberClientes(billingsF, recebimentosF);
  const aReceberPropria = totalAReceber(billingsF, recebimentosF);

  // KPI 4 — valor cheio (qualquer natureza), pra bater com o que o cliente
  // vê em Faturamento (ajuste 3 do pedido — antes só contava receita
  // própria e mostrava R$0 com cobranças de repasse realmente atrasadas).
  const { total: atrasoTotal, quantidade: atrasoQtd } = emAtrasoTotal(billingsF, recebimentosF);

  // KPI 5
  const custodia = repassesEmCustodia(billingsF, recebimentosF, expensesF);
  const caucao = caucaoEmCustodia(billingsF, recebimentosF);
  const aPagarFornecedores = totalAPagarFornecedores(contasPagarF);

  // KPI 6 — corrige o "100% com zero propostas enviadas" (null vira "—")
  const conversao = taxaConversao(proposalsF);

  // KPI 7
  const indice = indiceRecebimento(billingsF, recebimentosF);

  const atualizadoEm = now.toLocaleTimeString(localeDate, { hour: "2-digit", minute: "2-digit" });

  const handleVerComoCliente = () => {
    if (selectedClientId === "all") return;
    const client = clients.find((c) => c.id === selectedClientId);
    startViewAs(selectedClientId, client?.nome);
  };

  return (
    <div>
      <TaskNotifications tasks={tasks} />
      <DeadlineAlerts />
      <DashboardBannerHeader
        data={now.toLocaleDateString(localeDate, { weekday: "long", day: "numeric", month: "long" })}
      />

      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-full md:w-64 bg-secondary border-border">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClientId !== "all" && (
          <Button variant="outline" size="sm" onClick={handleVerComoCliente} className="gap-1.5 flex-shrink-0">
            <Eye className="w-3.5 h-3.5" /> Ver como cliente
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-2">
        <KpiCard
          title="Receita Própria do Mês (Caixa)"
          value={formatBRL(receitaMes.total)}
          icon={DollarSign}
          valueClassName="text-emerald-400"
          trendLabel={
            receitaNaoClassificada > 0
              ? <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3 flex-shrink-0" /> {formatBRL(receitaNaoClassificada)} recebido(s) este mês sem classificação de natureza — não contam aqui. Classifique em Faturamento.</span>
              : `Honorário ${formatBRL(receitaMes.honorario)} · Intermediação ${formatBRL(receitaMes.intermediacao)} · Comissão ${formatBRL(receitaMes.comissao)}`
          }
        />
        <KpiCard
          title="Faturado do Mês (Competência)"
          value={formatBRL(faturadoMes)}
          icon={FileText}
          trendLabel="Por data de emissão/assinatura do contrato"
        />
        <KpiCard
          title="A Receber dos Clientes"
          value={formatBRL(aReceberClientes)}
          icon={Wallet}
          to="/faturamento?status=aberto"
          trendLabel="Valor cheio (repasse + receita própria + caução)"
        />
        <KpiCard
          title="Sua Receita a Receber"
          value={formatBRL(aReceberPropria)}
          icon={Wallet}
          trendLabel="Só honorário + intermediação + comissão"
        />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-1">
        <KpiCard
          title="Em Atraso"
          value={formatBRL(atrasoTotal)}
          icon={AlertCircle}
          valueClassName="text-red-400"
          to="/faturamento?status=atrasado"
          trendLabel={atrasoQtd > 0 ? `${atrasoQtd} cobrança${atrasoQtd > 1 ? "s" : ""}` : "nenhuma"}
        />
        <KpiCard
          title="Repasses em Custódia"
          value={formatBRL(custodia)}
          icon={Wallet}
        />
        <KpiCard
          title="Caução em Custódia"
          value={formatBRL(caucao)}
          icon={Wallet}
          to="/faturamento?tipo=caucao"
        />
        <KpiCard
          title="A Pagar a Fornecedores"
          value={formatBRL(aPagarFornecedores)}
          icon={AlertCircle}
          valueClassName="text-red-400"
          trendLabel="Custos vinculados a contratos de clientes (repasse) — não é margem própria"
        />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-1">
        <KpiCard
          title={t("dash_conversion_rate")}
          value={conversao === null ? "—" : `${conversao}%`}
          icon={TrendingUp}
        />
        <KpiCard
          title="Índice de Recebimento"
          value={indice === null ? "—" : `${indice}%`}
          icon={Percent}
        />
        <KpiCard
          title={t("dash_active_clients")}
          value={clients.length}
          icon={Users}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mb-6 md:mb-8">
        Período: {now.toLocaleDateString(localeDate, { month: "long", year: "numeric" })} · Atualizado às {atualizadoEm}
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="xl:col-span-2">
          <DashboardPipeline proposals={proposalsF} />
        </div>
        <DashboardAgenda tasks={tasksF} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <div className="xl:col-span-2">
          <DashboardRevenueChart billings={billingsF} recebimentos={recebimentosF} />
        </div>
        <DashboardClients clients={clients} />
      </div>
    </div>
  );
}