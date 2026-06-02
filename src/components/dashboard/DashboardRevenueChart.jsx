import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useLanguage } from "@/lib/i18n";

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function DashboardRevenueChart({ revenues }) {
  const { t } = useLanguage();

  const chartData = revenues
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .slice(-6)
    .map((r) => ({ name: `${monthNames[r.mes - 1]}/${r.ano % 100}`, receita: r.valor }));

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-display text-lg font-semibold text-foreground mb-4">{t("dash_revenue_chart")}</h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">{t("chart_no_revenue")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "hsl(220 14% 11%)", border: "1px solid hsl(220 12% 18%)", borderRadius: "8px", fontSize: "12px", fontFamily: "JetBrains Mono" }}
              formatter={(value) => [`${t("currency_symbol")} ${value.toLocaleString(t("locale_date"))}`, t("dash_monthly_revenue")]}
            />
            <Bar dataKey="receita" fill="hsl(43 50% 54%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}