import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const COLORS = ["hsl(43 50% 54%)", "hsl(200 60% 50%)", "hsl(160 50% 45%)", "hsl(280 50% 55%)", "hsl(20 70% 55%)"];

const tooltipStyle = {
  background: "hsl(220 14% 11%)",
  border: "1px solid hsl(220 12% 18%)",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "JetBrains Mono",
};

export default function Reports() {
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: () => base44.entities.Revenue.list("-ano", 24),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list("-created_date", 500),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-valor_total", 200),
  });

  // Revenue by month
  const revenueData = revenues
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .slice(-12)
    .map((r) => ({
      name: `${monthNames[r.mes - 1]}/${r.ano % 100}`,
      receita: r.valor,
    }));

  // Conversion rate by month
  const conversionData = revenues
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .slice(-12)
    .map((r) => {
      const monthProposals = proposals.filter(
        (p) => {
          const d = new Date(p.created_date);
          return d.getMonth() + 1 === r.mes && d.getFullYear() === r.ano;
        }
      );
      const confirmed = monthProposals.filter((p) => p.status === "confirmado" || p.status === "concluido").length;
      const rate = monthProposals.length > 0 ? Math.round((confirmed / monthProposals.length) * 100) : 0;
      return { name: `${monthNames[r.mes - 1]}/${r.ano % 100}`, taxa: rate };
    });

  // Top clients
  const topClients = [...clients]
    .filter((c) => c.valor_total > 0)
    .sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0))
    .slice(0, 5)
    .map((c) => ({ name: c.nome, valor: c.valor_total }));

  // Seasonality
  const seasonality = Array.from({ length: 12 }, (_, i) => {
    const count = proposals.filter((p) => {
      if (!p.data_chegada) return false;
      return new Date(p.data_chegada).getMonth() === i;
    }).length;
    return { name: monthNames[i], demanda: count };
  });

  const ChartCard = ({ title, children }) => (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-display text-lg font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Análise de desempenho" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Receita por Mês">
          {revenueData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]} />
                <Bar dataKey="receita" fill="hsl(43 50% 54%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Taxa de Conversão (%)">
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

        <ChartCard title="Top Clientes por Valor">
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
                          R$ {c.valor.toLocaleString("pt-BR")}
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

        <ChartCard title="Sazonalidade de Demanda">
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
}