import React from "react";
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
  receitaCaixaDoMes, faturadoCompetenciaDoMes, totalAReceber, emAtraso,
  repassesEmCustodia, taxaConversao, indiceRecebimento,
} from "@/lib/finance";

// KPIs oficiais do Dashboard Admin — todos calculados via src/lib/finance.js
// (regra R8: fonte única, mesma usada em Faturamento, Relatórios e Portal).
export default function Dashboard() {
  const { t, lang } = useLanguage();

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

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const localeDate = t("locale_date");
  const currSymbol = t("currency_symbol");

  // KPI 1 e 2 — Receita (caixa) x Faturado (competência), nunca a mesma coisa.
  const receitaMes = receitaCaixaDoMes(billings, recebimentos, currentMonth, currentYear);
  const faturadoMes = faturadoCompetenciaDoMes(billings, currentMonth, currentYear);

  // KPI 3 e 4
  const aReceber = totalAReceber(billings, recebimentos);
  const { total: atrasoTotal, quantidade: atrasoQtd } = emAtraso(billings, recebimentos);

  // KPI 5
  const custodia = repassesEmCustodia(billings, recebimentos, expenses);

  // KPI 6 — corrige o "100% com zero propostas enviadas" (null vira "—")
  const conversao = taxaConversao(proposals);

  // KPI 7
  const indice = indiceRecebimento(billings, recebimentos);

  const atualizadoEm = now.toLocaleTimeString(localeDate, { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <TaskNotifications tasks={tasks} />
      <DeadlineAlerts />
      <PageHeader
        title={t("nav_overview")}
        subtitle={now.toLocaleDateString(localeDate, { weekday: "long", day: "numeric", month: "long" })}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-2">
        <KpiCard
          title={`${t("dash_monthly_revenue")} (Caixa)`}
          value={`${currSymbol} ${receitaMes.toLocaleString(localeDate)}`}
          icon={DollarSign}
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
          <DashboardPipeline proposals={proposals} />
        </div>
        <DashboardAgenda tasks={tasks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <div className="xl:col-span-2">
          <DashboardRevenueChart billings={billings} recebimentos={recebimentos} />
        </div>
        <DashboardClients clients={clients} />
      </div>
    </div>
  );
}
