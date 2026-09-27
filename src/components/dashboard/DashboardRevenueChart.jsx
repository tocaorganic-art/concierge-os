import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { useLanguage } from "@/lib/i18n";

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

// Receita, Despesa e Lucro dos últimos 6 meses — calculados direto de
// Billing (recebido) e Expense (pago), não mais de um lançamento manual
// desconectado. Gráfico combinado (barras + linha de lucro) em vez de uma
// única série, para dar a mesma leitura de "dinheiro entrando vs. saindo"
// que o restante do painel já mostra por cliente.
export default function DashboardRevenueChart({ billings = [], expenses = [] }) {
  const { t } = useLanguage();

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` };
  });

  const revenueByMonth = {};
  billings.filter((b) => b.status === "recebido").forEach((b) => {
    const k = monthKey(b.data_pagamento);
    if (k) revenueByMonth[k] = (revenueByMonth[k] || 0) + (b.valor || 0);
  });

  const expenseByMonth = {};
  expenses.forEach((e) => {
    const k = monthKey(e.data_despesa);
    if (k) expenseByMonth[k] = (expenseByMonth[k] || 0) + (e.valor || 0);
  });

  const chartData = months.map(({ key, label }) => {
    const receita = revenueByMonth[key] || 0;
    const despesa = expenseByMonth[key] || 0;
    return { name: label, receita, despesa, lucro: receita - despesa };
  });

  const hasData = chartData.some((d) => d.receita > 0 || d.despesa > 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">{t("dash_revenue_chart")}</h3>
      {!hasData ? (
        <p className="text-sm text-muted-foreground text-center py-12">{t("chart_no_revenue")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "hsl(220 14% 11%)", border: "1px solid hsl(220 12% 18%)", borderRadius: "8px", fontSize: "12px", fontFamily: "JetBrains Mono" }}
              formatter={(value, name) => [`${t("currency_symbol")} ${value.toLocaleString(t("locale_date"))}`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
            <Bar dataKey="receita" name="Receita" fill="hsl(24 87% 56%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesa" name="Despesa" fill="hsl(220 12% 30%)" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(160 50% 45%)" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
