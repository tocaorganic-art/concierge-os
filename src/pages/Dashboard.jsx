import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, FileText, TrendingUp, Users, AlertCircle, Wallet, Percent } from "lucide-react";
import KpiCard from "@/components/shared/KpiCard";
import PageHeader from "@/components/shared/PageHeader";
import DashboardPipeline from "@/components/dashboard/DashboardPipeline";
import DashboardAgenda from "@/components/dashboard/DashboardAgenda";
import DashboardClients from "@/components/dashboard/DashboardClients";
import DashboardRevenueChart from "@/components/dashboard/DashboardRevenueChart";
import { useLanguage } from "@/lib/i18n";
import TaskNotifications from "@/components/dashboard/TaskNotifications";
import DeadlineAlerts from "@/components/dashboard/DeadlineAlerts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  receitaCaixaDoMesPorNatureza, faturadoCompetenciaDoMes, totalAReceber, emAtraso,
  repassesEmCustodia, taxaConversao, indiceRecebimento, caucaoEmCustodia, totalAPagarFornecedores,
} from "@/lib/finance";

// KPIs oficiais do Dashboard Admin — todos calculados via src/lib/finance.js
// (regra R8: fonte única, mesma usada em Faturamento, Relatórios e Portal).
//
// Todos os KPIs financeiros são calculados sobre TODOS os clientes juntos por
// padrão — com mais de um cliente ativo isso mistura contratos diferentes em
// um único número (ex.: repasses em custódia de um cliente cancelando o de
// outro). O seletor abaixo filtra billings/recebimentos/expenses/contasPagar/
// propostas/tarefas por client_id antes de calcular qualquer KPI.
export default function Dashboard() {
  const { t, lang } = useLanguage();
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
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ["contas-pagar-dashboard"],
    queryFn: () => base44.entities.ContaPagar.list("-data_vencimento", 500),
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const localeDate = t("locale_date");
  const currSymbol = t("currency_symbol");

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
  // x Faturado (competência), nunca a mesma coisa.
  const receitaMes = receitaCaixaDoMesPorNatureza(billingsF, recebimentosF, currentMonth, currentYear);
  const faturadoMes = faturadoCompetenciaDoMes(billingsF, currentMonth, currentYear);

  // KPI 3 e 4
  const aReceber = totalAReceber(billingsF, recebimentosF);
  const { total: atrasoTotal, quantidade: atrasoQtd } = emAtraso(billingsF, recebimentosF);

  // KPI 5
  const custodia = repassesEmCustodia(billingsF, recebimentosF, expensesF);
  const caucao = caucaoEmCustodia(billingsF, recebimentosF);
  const aPagarFornecedores = totalAPagarFornecedores(contasPagarF);

  // KPI 6 — corrige o "100% com zero propostas enviadas" (null vira "—")
  const conversao = taxaConversao(proposalsF);

  // KPI 7
  const indice = indiceRecebimento(billingsF, recebimentosF);

  const atualizadoEm = now.toLocaleTimeString(localeDate, { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <TaskNotifications tasks={tasks} />
      <DeadlineAlerts />
      <PageHeader
        title={t("nav_overview")}
        subtitle={now.toLocaleDateString(localeDate, { weekday: "long", day: "numeric", month: "long" })}
      />

      <div className="mb-4 md:mb-6">
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
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-2">
        <KpiCard
          title="Receita Própria do Mês (Caixa)"
          value={`${currSymbol} ${receitaMes.total.toLocaleString(localeDate)}`}
          icon={DollarSign}
          valueClassName="text-emerald-400"
          trendLabel={`Honorário ${currSymbol} ${receitaMes.honorario.toLocaleString(localeDate)} · Intermediação ${currSymbol} ${receitaMes.intermediacao.toLocaleString(localeDate)} · Comissão ${currSymbol} ${receitaMes.comissao.toLocaleString(localeDate)}`}
        />
        <KpiCard
          title="Faturado do Mês (Competência)"
          value={`${currSymbol} ${faturadoMes.toLocaleString(localeDate)}`}
          icon={FileText}
        />
        <KpiCard
          title="A Receber"
          value={`${currSymbol} ${aReceber.toLocaleString(localeDate)}`}
          icon={Wallet}
        />
        <KpiCard
          title="Em Atraso"
          value={`${currSymbol} ${atrasoTotal.toLocaleString(localeDate)}`}
          icon={AlertCircle}
          valueClassName="text-red-400"
          trendLabel={atrasoQtd > 0 ? `${atrasoQtd} cobrança${atrasoQtd > 1 ? "s" : ""}` : "nenhuma"}
        />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-1">
        <KpiCard
          title="Repasses em Custódia"
          value={`${currSymbol} ${custodia.toLocaleString(localeDate)}`}
          icon={Wallet}
        />
        <KpiCard
          title="Caução em Custódia"
          value={`${currSymbol} ${caucao.toLocaleString(localeDate)}`}
          icon={Wallet}
        />
        <KpiCard
          title="A Pagar a Fornecedores"
          value={`${currSymbol} ${aPagarFornecedores.toLocaleString(localeDate)}`}
          icon={AlertCircle}
          valueClassName="text-red-400"
        />
        <KpiCard
          title="Índice de Recebimento"
          value={indice === null ? "—" : `${indice}%`}
          icon={Percent}
        />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-1">
        <KpiCard
          title={t("dash_conversion_rate")}
          value={conversao === null ? "—" : `${conversao}%`}
          icon={TrendingUp}
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
