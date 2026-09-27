import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, FileText, TrendingUp, Users } from "lucide-react";
import KpiCard from "@/components/shared/KpiCard";
import PageHeader from "@/components/shared/PageHeader";
import DashboardPipeline from "@/components/dashboard/DashboardPipeline";
import DashboardAgenda from "@/components/dashboard/DashboardAgenda";
import DashboardClients from "@/components/dashboard/DashboardClients";
import DashboardRevenueChart from "@/components/dashboard/DashboardRevenueChart";
import { useLanguage } from "@/lib/i18n";
import TaskNotifications from "@/components/dashboard/TaskNotifications";
import DeadlineAlerts from "@/components/dashboard/DeadlineAlerts";

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

  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: () => base44.entities.Revenue.list("-ano", 12),
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const localeDate = t("locale_date");

  const monthRevenue = revenues
    .filter((r) => r.mes === currentMonth && r.ano === currentYear)
    .reduce((sum, r) => sum + (r.valor || 0), 0);

  // Tendência real: mês atual vs. mês anterior (só se houver receita no mês anterior)
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevRevenue = revenues
    .filter((r) => r.mes === prevMonth && r.ano === prevYear)
    .reduce((sum, r) => sum + (r.valor || 0), 0);
  const revenueTrend = prevRevenue > 0
    ? Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 100)
    : undefined;

  const activeProposals = proposals.filter(
    (p) => p.status === "lead" || p.status === "proposta"
  ).length;

  const confirmed = proposals.filter(
    (p) => p.status === "confirmado" || p.status === "concluido"
  ).length;

  const conversionRate = proposals.length > 0
    ? Math.round((confirmed / proposals.length) * 100)
    : 0;

  const currSymbol = t("currency_symbol");

  return (
    <div>
      <TaskNotifications tasks={tasks} />
      <DeadlineAlerts />
      <PageHeader
        title={t("nav_overview")}
        subtitle={now.toLocaleDateString(localeDate, { weekday: "long", day: "numeric", month: "long" })}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <KpiCard
          title={t("dash_monthly_revenue")}
          value={`${currSymbol} ${monthRevenue.toLocaleString(localeDate)}`}
          icon={DollarSign}
          trend={revenueTrend}
          trendLabel={t("dash_vs_last_month")}
        />
        <KpiCard
          title={t("dash_active_proposals")}
          value={activeProposals}
          icon={FileText}
        />
        <KpiCard
          title={t("dash_conversion_rate")}
          value={`${conversionRate}%`}
          icon={TrendingUp}
        />
        <KpiCard
          title={t("dash_active_clients")}
          value={clients.length}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="xl:col-span-2">
          <DashboardPipeline proposals={proposals} />
        </div>
        <DashboardAgenda tasks={tasks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <div className="xl:col-span-2">
          <DashboardRevenueChart revenues={revenues} />
        </div>
        <DashboardClients clients={clients} />
      </div>
    </div>
  );
}