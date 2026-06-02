import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import { useLanguage } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import PlanGate from "@/components/monetization/PlanGate";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from "recharts";

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const tooltipStyle = {
  background: "hsl(220 14% 11%)",
  border: "1px solid hsl(220 12% 18%)",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "JetBrains Mono",
};

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

  const isLoading = loadingRevenues || loadingProposals || loadingClients || planLoading;

  const revenueData = revenues
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .slice(-12)
    .map((r) => ({ name: `${monthNames[r.mes - 1]}/${r.ano % 100}`, receita: r.valor }));

  const conversionData = revenues
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .slice(-12)
    .map((r) => {
      const monthProposals = proposals.filter((p) => {
        const d = new Date(p.created_date);
        return d.getMonth() + 1 === r.mes && d.getFullYear() === r.ano;
      });
      const confirmed = monthProposals.filter((p) => p.status === "confirmado" || p.status === "concluido").length;
      const rate = monthProposals.length > 0 ? Math.round((confirmed / monthProposals.length) * 100) : 0;
      return { name: `${monthNames[r.mes - 1]}/${r.ano % 100}`, taxa: rate };
    });

  const topClients = [...clients]
    .filter((c) => c.valor_total > 0)
    .sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0))
    .slice(0, 5)
    .map((c) => ({ name: c.nome, valor: c.valor_total }));

  const seasonality = Array.from({ length: 12 }, (_, i) => {
    const count = proposals.filter((p) => p.data_chegada && new Date(p.data_chegada).getMonth() === i).length;
    return { name: monthNames[i], demanda: count };
  });

  const totalProposals = proposals.length;
  const confirmed = proposals.filter((p) => p.status === "confirmado" || p.status === "concluido").length;
  const conversionRate = totalProposals > 0 ? Math.round((confirmed / totalProposals) * 100) : null;
  const totalRevenue = revenues.reduce((s, r) => s + (r.valor || 0), 0);

  const ChartCard = ({ title, children }) => (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-display text-lg font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const reportsContent = (
    <div>
      {/* Summary KPIs */}
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title={t("chart_revenue")}>
          {revenueData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="receita" fill="hsl(43 50% 54%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t("chart_conversion")}>
          {conversionData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Taxa"]} />
                <Line type="monotone" dataKey="taxa" stroke="hsl(200 60% 50%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(200 60% 50%)" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t("chart_top_clients")}>
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {topClients.map((c, i) => {
                const max = topClients[0]?.valor || 1;
                const pct = (c.valor / max) * 100;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <span className="font-display text-sm font-semibold text-primary">
                          {t("currency_symbol")} {c.valor.toLocaleString(t("locale_date"))}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard title={t("chart_seasonality")}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={seasonality}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Propostas"]} />
              <Bar dataKey="demanda" fill="hsl(160 50% 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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