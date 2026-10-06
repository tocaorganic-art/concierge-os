import React from "react";
import { Sparkles, FileText, CheckCircle2, Wallet, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import KpiCard from "@/components/shared/KpiCard";
import { useLanguage, safeLocaleDate } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import PlanGate from "@/components/monetization/PlanGate";
import FunnelChart from "@/components/reports/FunnelChart";
import AIRecommendations from "@/components/reports/AIRecommendations";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { taxaConversao, valorRecebido, saldoDevedor, emAtrasoTotal, agruparBillingsCliente, roundCents } from "@/lib/finance";
import { formatBRL } from "@/lib/formatBRL";

// Relatórios de uma conta "cliente" — painel analítico do EVENTO dele (nunca
// despesas internas, lucro, ranking de outros clientes — esses conceitos não
// fazem sentido pra uma única conta e a maioria nem é mais legível via API
// pra esse papel). Não guarda nem lista comprovantes aqui — isso continua em
// Documentos/Faturamento; esta tela só resume os números que já vêm de lá.
function ReportsCliente({ recebimentos, billings, t }) {
  const localeDate = safeLocaleDate(t);
  const fmt = (v) => formatBRL(v);

  const ativos = billings.filter((b) => b.status !== "cancelado");

  if (billings.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">{t("reports_empty_client")}</p>;
  }

  const totalContratado = roundCents(ativos.reduce((s, b) => s + (b.valor || 0), 0));
  const totalPago = roundCents(ativos.reduce((s, b) => s + valorRecebido(b, recebimentos), 0));
  const totalAPagar = roundCents(ativos.reduce((s, b) => s + Math.max(0, saldoDevedor(b, recebimentos)), 0));
  const { total: emAtrasoValor, quantidade: emAtrasoQtd } = emAtrasoTotal(billings, recebimentos);

  const { adicionais, caucao } = agruparBillingsCliente(billings);
  const caucaoContratada = roundCents(caucao.reduce((s, b) => s + (b.valor || 0), 0));
  const despesasFixas = roundCents(adicionais.filter((b) => b.tipo_despesa === "fixa").reduce((s, b) => s + (b.valor || 0), 0));
  const despesasVariaveis = roundCents(adicionais.filter((b) => b.tipo_despesa === "variavel").reduce((s, b) => s + (b.valor || 0), 0));

  const porCategoria = {};
  adicionais.forEach((b) => {
    const k = b.categoria?.trim() || t("common_categoria_outros");
    porCategoria[k] = roundCents((porCategoria[k] || 0) + (b.valor || 0));
  });
  const categoriaData = Object.entries(porCategoria).map(([name, value]) => ({ name, value }));

  const monthKeyLocal = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${dt.getMonth() + 1}`;
  };
  const pagoPorMes = {};
  recebimentos.forEach((r) => {
    if (!r.data_recebimento) return;
    const k = monthKeyLocal(r.data_recebimento);
    pagoPorMes[k] = roundCents((pagoPorMes[k] || 0) + (r.valor || 0));
  });
  const now = new Date();
  const evolucaoData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    return { name: `${t(monthKeyToI18nKey(d.getMonth()))}/${String(d.getFullYear()).slice(2)}`, pago: pagoPorMes[key] || 0 };
  });

  const proximosVencimentos = ativos
    .filter((b) => saldoDevedor(b, recebimentos) > 0 && b.data_vencimento)
    .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard title={t("dash_kpi_total_contratado")} value={fmt(totalContratado)} icon={FileText} to="/faturamento" />
        <KpiCard title={t("reports_kpi_total_pago")} value={fmt(totalPago)} icon={CheckCircle2} valueClassName="text-emerald-400" to="/faturamento?status=recebido" />
        <KpiCard title={t("dash_kpi_a_pagar")} value={fmt(totalAPagar)} icon={Wallet} to="/faturamento?status=aberto" />
        <KpiCard title={t("dash_kpi_caucao")} value={fmt(caucaoContratada)} icon={Wallet} to="/faturamento?tipo=caucao" />
        <KpiCard
          title={t("dash_kpi_em_atraso")}
          value={fmt(emAtrasoValor)}
          icon={AlertCircle}
          valueClassName={emAtrasoQtd > 0 ? "text-red-400" : undefined}
          to="/faturamento?status=atrasado"
          trendLabel={emAtrasoQtd > 0 ? `${emAtrasoQtd} ${emAtrasoQtd > 1 ? t("common_cobranca_plural") : t("common_cobranca_singular")}` : t("common_nenhuma")}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title={t("reports_chart_fixed_vs_variable_title")}>
          {despesasFixas === 0 && despesasVariaveis === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t("reports_empty_no_expenses")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{ name: "Despesas", fixa: despesasFixas, variavel: despesasVariaveis }]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={0} tick={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(v), ""]} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
                <Bar dataKey="fixa" name={t("reports_chart_fixed")} fill="hsl(24 87% 56%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="variavel" name={t("reports_chart_variable")} fill="hsl(200 60% 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t("reports_chart_by_category_title")}>
          {categoriaData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t("reports_empty_no_expenses")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoriaData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {categoriaData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(v), ""]} />
                <Legend formatter={(val) => <span style={{ color: "hsl(220 10% 70%)", fontSize: 11, fontFamily: "JetBrains Mono" }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t("reports_chart_payment_evolution_title")}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={evolucaoData}>
              <defs>
                <linearGradient id="gradPagoCliente" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24 87% 56%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(24 87% 56%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(v), t("reports_chart_paid")]} />
              <Area type="monotone" dataKey="pago" stroke="hsl(24 87% 56%)" fill="url(#gradPagoCliente)" strokeWidth={2} name={t("reports_chart_paid")} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("reports_chart_upcoming_due_title")}>
          {proximosVencimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t("reports_empty_no_due")}</p>
          ) : (
            <div className="divide-y divide-border">
              {proximosVencimentos.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{b.descricao || t("common_cobranca_fallback")}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(b.data_vencimento).toLocaleDateString(localeDate)}</p>
                  </div>
                  <span className="font-display font-semibold text-foreground flex-shrink-0">{fmt(Math.max(0, saldoDevedor(b, recebimentos)))}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_I18N_KEYS = [
  "common_month_short_1", "common_month_short_2", "common_month_short_3", "common_month_short_4",
  "common_month_short_5", "common_month_short_6", "common_month_short_7", "common_month_short_8",
  "common_month_short_9", "common_month_short_10", "common_month_short_11", "common_month_short_12",
];
const monthKeyToI18nKey = (monthIndex) => MONTH_I18N_KEYS[monthIndex];
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
      {badge && <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">{badge}</span>}
    </div>
    {children}
  </div>
);

export default function Reports() {
  const { t } = useLanguage();
  const { hasProAccess, isLoading: planLoading } = usePlan();
  const { isClientMode, effectiveClientId } = useEffectiveRole();

  // Receita/despesa calculadas direto de Billing (recebido) e Expense (pago) —
  // não mais da entidade Revenue (lançamento manual desconectado do
  // faturamento real, achado de auditoria).
  const { data: billings = [], isLoading: loadingBillings } = useQuery({
    queryKey: ["billings-reports"],
    queryFn: () => base44.entities.Billing.list("-data_vencimento", 1000),
  });
  const { data: recebimentos = [] } = useQuery({
    queryKey: ["recebimentos"],
    queryFn: () => base44.entities.Recebimento.list("-data_recebimento", 1000),
  });
  // Expense não é lido no branch isClientMode abaixo (ReportsCliente usa só
  // billings/recebimentos) — `enabled` evita a chamada à toa pra uma conta
  // cliente, que a RLS de Expense bloqueia por completo (só created_by_id ou
  // admin podem ler; ver base44/entities/Expense.jsonc), mesmo padrão já
  // usado pela query equivalente em src/pages/Dashboard.jsx.
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses-reports"],
    queryFn: () => base44.entities.Expense.list("-data_despesa", 1000),
    enabled: !isClientMode,
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

  const isLoading = loadingBillings || loadingExpenses || loadingProposals || loadingClients || planLoading;

  const monthKey = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  };

  const revenueByMonth = {};
  recebimentos.forEach((r) => {
    const k = monthKey(r.data_recebimento);
    if (k) revenueByMonth[k] = (revenueByMonth[k] || 0) + (r.valor || 0);
  });
  const expenseByMonth = {};
  expenses.forEach((e) => {
    const k = monthKey(e.data_despesa);
    if (k) expenseByMonth[k] = (expenseByMonth[k] || 0) + (e.valor || 0);
  });

  const now = new Date();
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` };
  });

  // Receita/despesa acumulada (área chart)
  const revenueData = last12Months.reduce((acc, { key, label }) => {
    const receita = revenueByMonth[key] || 0;
    const despesa = expenseByMonth[key] || 0;
    const prev = acc.length > 0 ? acc[acc.length - 1].acumulado : 0;
    acc.push({ name: label, receita, despesa, acumulado: prev + receita });
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
  const conversionRate = taxaConversao(proposals);
  const totalRevenue = billings.reduce((s, b) => s + valorRecebido(b, recebimentos), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.valor || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isClientMode) {
    const recebimentosCliente = recebimentos.filter((r) => r.client_id === effectiveClientId);
    const billingsCliente = billings.filter((b) => b.client_id === effectiveClientId);
    return (
      <div>
        <PageHeader title={t("reports_title")} subtitle={t("reports_subtitle")} />
        <ReportsCliente recebimentos={recebimentosCliente} billings={billingsCliente} t={t} />
      </div>
    );
  }

  const reportsContent = (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {[
          { label: t("reports_total_proposals"), value: totalProposals || "—" },
          { label: t("reports_conversion_rate"), value: conversionRate !== null ? `${conversionRate}%` : "—" },
          { label: t("reports_active_clients"), value: clients.length || "—" },
          { label: t("reports_total_revenue"), value: totalRevenue > 0 ? formatBRL(totalRevenue) : "—" },
          { label: "Despesas Totais", value: totalExpenses > 0 ? formatBRL(totalExpenses) : "—" },
          { label: "Lucro Total", value: totalRevenue > 0 || totalExpenses > 0 ? formatBRL(totalProfit) : "—" },
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
        <ChartCard title="Funil de Vendas" badge={<><Sparkles className="w-2.5 h-2.5" /> IA</>}>
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
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
                <Area type="monotone" dataKey="acumulado" stroke="hsl(24 87% 56%)" fill="url(#gradReceita)" strokeWidth={2} name="Receita acumulada" />
                <Area type="monotone" dataKey="receita" stroke="hsl(200 60% 50%)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" name="Receita mensal" />
                <Area type="monotone" dataKey="despesa" stroke="hsl(220 12% 45%)" fill="transparent" strokeWidth={1.5} strokeDasharray="2 2" name="Despesa mensal" />
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
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatBRL(v), "Valor"]} />
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