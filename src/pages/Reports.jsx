import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import { useLanguage } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import PlanGate from "@/components/monetization/PlanGate";
import FunnelChart from "@/components/reports/FunnelChart";
import AIRecommendations from "@/components/reports/AIRecommendations";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const tooltipStyle = {
  background: "hsl(220 14% 11%)",
  border: "1px solid hsl(220 12% 18%)",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "JetBrains Mono",
};

const PIE_COLORS = ["hsl(24 87% 56%)", "hsl(200 60% 50%)", "hsl(160 50% 45%)", "hsl(280 50% 55%)", "hsl(20 70% 55%)"];

const ChartCard = ({ title, children, badge }) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="flex items-center gap-2 mb-4">
      <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
      {badge && <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">{badge}</span>}
    </div>
    {children}
  </div>
);

export default function Reports() {
  const { t } = useLanguage();
  const { hasProAccess, isLoading: planLoading } = usePlan();

  const { data: revenues = [], isLoading: loadingRevenues } = useQuery({
    queryKey: ["revenues"],
    queryFn: () => base44.entities.Revenue.list("-ano", 24),
  });
  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list("-created_date", 500),
  });
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-valor_total", 200),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-data", 200),
  });

  const isLoading = loadingRevenues || loadingProposals || loadingClients || planLoading;

  // Receita acumulada (área chart)
  const revenueData = revenues
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .slice(-12)
    .reduce((acc, r) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].acumulado : 0;
      acc.push({ name: `${monthNames[r.mes - 1]}/${r.ano % 100}`, receita: r.valor, acumulado: prev + r.valor });
      return acc;
    }, []);

  // Top 5 clientes
  const topClients = [...clients]
    .filter((c) => c.valor_total > 0)
    .sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0))
    .slice(0, 5)
    .map((c) => ({ name: c.nome.split(" ")[0], valor: c.valor_total }));

  // Pizza por tipo de cliente
  const tipoCount = clients.reduce((acc, c) => {
    if (c.tipo) acc[c.tipo] = (acc[c.tipo] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(tipoCount).map(([name, value]) => ({ name, value }));

  const totalProposals = proposals.length;
  const confirmed = proposals.filter((p) => p.status === "confirmado" || p.status === "concluido").length;
  const conversionRate = totalProposals > 0 ? Math.round((confirmed / totalProposals) * 100) : null;
  const totalRevenue = revenues.reduce((s, r) => s + (r.valor || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const reportsContent = (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: t("reports_total_proposals"), value: totalProposals || "—" },
          { label: t("reports_conversion_rate"), value: conversionRate !== null ? `${conversionRate}%` : "—" },
          { label: t("reports_active_clients"), value: clients.length || "—" },
          { label: t("reports_total_revenue"), value: totalRevenue > 0 ? `${t("currency_symbol")} ${totalRevenue.toLocaleString(t("locale_date"))}` : "—" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{kpi.label}</p>
            <p className="font-display text-2xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* AI Recommendations */}
      <div className="mb-6">
        <AIRecommendations proposals={proposals} clients={clients} tasks={tasks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Funnel */}
        <ChartCard title="Funil de Vendas" badge="✦ IA">
          <FunnelChart proposals={proposals} />
        </ChartCard>

        {/* Receita acumulada (área) */}
        <ChartCard title={t("chart_revenue")}>
          {revenueData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24 87% 56%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24 87% 56%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="acumulado" stroke="hsl(24 87% 56%)" fill="url(#gradReceita)" strokeWidth={2} name="Acumulado" />
                <Area type="monotone" dataKey="receita" stroke="hsl(200 60% 50%)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" name="Mensal" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top clientes barras horizontais */}
        <ChartCard title={t("chart_top_clients")}>
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topClients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fill: "hsl(220 10% 70%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`R$ ${v.toLocaleString("pt-BR")}`, "Valor"]} />
                <Bar dataKey="valor" fill="hsl(24 87% 56%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Donut por tipo */}
        <ChartCard title="Distribuição por Tipo de Cliente">
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  formatter={(val) => <span style={{ color: "hsl(220 10% 70%)", fontSize: 11, fontFamily: "JetBrains Mono" }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title={t("reports_title")} subtitle={t("reports_subtitle")} />
      <PlanGate
        locked={!hasProAccess}
        planName="Pro"
        title="Relatórios disponíveis no Plano Pro"
        description="Faça upgrade para o Pro e tenha acesso a análises completas de desempenho, conversão e receita."
      >
        {reportsContent}
      </PlanGate>
    </div>
  );
}