import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Star, MessageSquare, CheckCircle2 } from "lucide-react";

function KPI({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

const COLORS = ["#F07A2E", "#60a5fa", "#34d399", "#f87171"];

export default function ConciergeKPIs() {
  const { data: requests = [] } = useQuery({
    queryKey: ["kpi_requests"],
    queryFn: () => base44.entities.ServiceRequest.list("-created_date", 200),
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["kpi_profiles"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const { data: partners = [] } = useQuery({
    queryKey: ["kpi_partners"],
    queryFn: () => base44.entities.Partner.list(),
  });

  const totalRequests = requests.length;
  const resolved = requests.filter((r) => r.status === "resolvido").length;
  const pending = requests.filter((r) => r.status === "novo").length;
  const resolutionRate = totalRequests > 0 ? Math.round((resolved / totalRequests) * 100) : 0;

  const planCounts = { essencial: 0, premium: 0, black: 0 };
  profiles.forEach((p) => { if (planCounts[p.plan_id] !== undefined) planCounts[p.plan_id]++; });
  const activeSubscribers = profiles.filter((p) => ["active", "trialing"].includes(p.subscription_status)).length;

  const tipoCounts = [
    { name: "Experiência", value: requests.filter((r) => r.tipo === "experiencia").length },
    { name: "Reserva",     value: requests.filter((r) => r.tipo === "reserva").length },
    { name: "Exclusivo",   value: requests.filter((r) => r.tipo === "exclusivo").length },
    { name: "Urgente",     value: requests.filter((r) => r.tipo === "ajuda").length },
  ].filter((d) => d.value > 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("pt-BR", { weekday: "short" });
    const count = requests.filter((r) => {
      if (!r.created_date) return false;
      return new Date(r.created_date).toDateString() === d.toDateString();
    }).length;
    return { label, count };
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Dashboard Concierge</h1>
        <p className="text-xs text-muted-foreground mt-0.5">KPIs da operação em tempo real</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPI label="Assinantes ativos" value={activeSubscribers} sub={`${profiles.length} total`} icon={Users} color="bg-primary/10 text-primary" />
        <KPI label="Pedidos total" value={totalRequests} sub={`${pending} aguardando`} icon={MessageSquare} color="bg-blue-500/10 text-blue-400" />
        <KPI label="Taxa resolução" value={`${resolutionRate}%`} sub={`${resolved} resolvidos`} icon={CheckCircle2} color="bg-green-500/10 text-green-400" />
        <KPI label="Parceiros" value={partners.filter((p) => p.ativo).length} sub={`${partners.length} cadastrados`} icon={Star} color="bg-purple-500/10 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Pedidos — últimos 7 dias</h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={last7}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F07A2E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F07A2E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "hsl(220 14% 11%)", border: "1px solid hsl(220 12% 18%)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#F07A2E" strokeWidth={2} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Pedidos por tipo</h2>
          {tipoCounts.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Nenhum dado ainda</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={tipoCounts} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {tipoCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {tipoCounts.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground flex-1">{d.name}</span>
                    <span className="font-mono font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por plano</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: "essencial", label: "Essencial", emoji: "⚡", color: "border-blue-500/20 bg-blue-500/5" },
            { id: "premium",   label: "Premium",   emoji: "✦",  color: "border-primary/20 bg-primary/5" },
            { id: "black",     label: "Black",     emoji: "🖤", color: "border-foreground/10 bg-foreground/5" },
          ].map((plan) => (
            <div key={plan.id} className={`border rounded-xl p-4 text-center ${plan.color}`}>
              <div className="text-2xl mb-1">{plan.emoji}</div>
              <p className="font-display text-xl font-bold text-foreground">{planCounts[plan.id]}</p>
              <p className="text-xs text-muted-foreground">{plan.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}