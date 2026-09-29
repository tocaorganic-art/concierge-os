import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatBRL } from "@/lib/formatBRL";

const PIE_COLORS = ["hsl(24 87% 56%)", "hsl(200 60% 50%)", "hsl(160 50% 45%)", "hsl(280 50% 55%)"];
const tooltipStyle = {
  background: "hsl(220 14% 11%)",
  border: "1px solid hsl(220 12% 18%)",
  borderRadius: "8px",
  fontSize: "12px",
};

// "Seus pagamentos" — no lugar do gráfico de receita do admin: rosca por
// item do contrato (Seu Contrato / Adicionais / Caução) + linha do tempo
// dos recebimentos reais (ledger, nunca estimado).
export default function DashboardSeusPagamentos({ contrato, adicionais, caucao, recebimentos }) {
  const somaValor = (itens) => itens.reduce((sum, b) => sum + (b.valor || 0), 0);
  const pieData = [
    { name: "Seu Contrato", value: somaValor(contrato) },
    { name: "Adicionais", value: somaValor(adicionais) },
    { name: "Caução", value: somaValor(caucao) },
  ].filter((d) => d.value > 0);

  const timeline = [...recebimentos]
    .filter((r) => r.valor > 0)
    .sort((a, b) => (a.data_recebimento || "").localeCompare(b.data_recebimento || ""));

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Seus pagamentos</h3>
      {pieData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBRL(v)} />
              <Legend formatter={(val) => <span style={{ color: "hsl(220 10% 70%)", fontSize: 11 }}>{val}</span>} />
            </PieChart>
          </ResponsiveContainer>
          {timeline.length > 0 && (
            <div className="mt-3 space-y-1.5 pt-3 border-t border-border/60">
              {timeline.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {new Date(r.data_recebimento + "T00:00:00").toLocaleDateString("pt-BR")}{r.metodo ? ` · ${r.metodo}` : ""}
                  </span>
                  <span className="font-mono font-semibold text-emerald-400">{formatBRL(r.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
