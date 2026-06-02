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

export default function Dashboard() {
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

  // KPIs
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthRevenue = revenues
    .filter((r) => r.mes === currentMonth && r.ano === currentYear)
    .reduce((sum, r) => sum + (r.valor || 0), 0);

  const activeProposals = proposals.filter(
    (p) => p.status === "lead" || p.status === "proposta"
  ).length;

  const confirmed = proposals.filter(
    (p) => p.status === "confirmado" || p.status === "concluido"
  ).length;

  const conversionRate = proposals.length > 0
    ? Math.round((confirmed / proposals.length) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        subtitle={`${now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <KpiCard
          title="Receita do Mês"
          value={`R$ ${monthRevenue.toLocaleString("pt-BR")}`}
          icon={DollarSign}
          trend={12}
          trendLabel="vs. mês anterior"
        />
        <KpiCard
          title="Propostas Ativas"
          value={activeProposals}
          icon={FileText}
        />
        <KpiCard
          title="Taxa de Conversão"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          trend={5}
        />
        <KpiCard
          title="Clientes Ativos"
          value={clients.length}
          icon={Users}
        />
      </div>

      {/* Pipeline mini + Agenda */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="xl:col-span-2">
          <DashboardPipeline proposals={proposals} />
        </div>
        <DashboardAgenda tasks={tasks} />
      </div>

      {/* Revenue chart + Recent clients */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        <div className="xl:col-span-2">
          <DashboardRevenueChart revenues={revenues} />
        </div>
        <DashboardClients clients={clients} />
      </div>
    </div>
  );
}