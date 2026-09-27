import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { useLanguage } from "@/lib/i18n";
import { serieReceitaFaturado6Meses } from "@/lib/finance";

// Receita (caixa, honorário recebido) x Faturado (competência, honorário
// emitido) dos últimos 6 meses — mesma fonte que os KPIs 1 e 2 do
// Dashboard (src/lib/finance.js, regra R8).
export default function DashboardRevenueChart({ billings = [], recebimentos = [] }) {
  const { t } = useLanguage();

  const chartData = serieReceitaFaturado6Meses(billings, recebimentos);
  const hasData = chartData.some((d) => d.receita > 0 || d.faturado > 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">{t("dash_revenue_chart")}</h3>
      {!hasData ? (
        <p className="text-sm text-muted-foreground text-center py-12">{t("chart_no_revenue")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "hsl(220 14% 11%)", border: "1px solid hsl(220 12% 18%)", borderRadius: "8px", fontSize: "12px", fontFamily: "JetBrains Mono" }}
              formatter={(value, name) => [`${t("currency_symbol")} ${value.toLocaleString(t("locale_date"))}`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
            <Bar dataKey="receita" name="Receita (caixa)" fill="hsl(24 87% 56%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="faturado" name="Faturado (competência)" fill="hsl(220 12% 35%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
