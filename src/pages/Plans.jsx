import React, { useState, useEffect } from "react";
import { Check, X, Crown, Star, Zap, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { stripeCheckout } from "@/functions/stripeCheckout";
import { useNavigate, useLocation } from "react-router-dom";

const STRIPE_PK = "pk_test_51THAMTRX4Ldl6df54rIqLtTN7csl8rLT32GwcloBxGPxdp7DSt3TKDGqqo5kIImeF8BLjH3hhgESnao6NCY6TRJL00VepMsogH";

// Price IDs reais do Stripe (gerados via stripeSetup em 2026-06-03)
const PRICE_IDS = {
  starter: {
    mensal: "price_1Te7qJRX4Ldl6df54K6Y5Gk5",
    anual:  "price_1Te7qJRX4Ldl6df5DiM3j04Z",
  },
  pro: {
    mensal: "price_1Te7qKRX4Ldl6df5hChLwuSH",
    anual:  "price_1Te7qKRX4Ldl6df5N4CZunsQ",
  },
  agency: {
    mensal: "price_1Te7qKRX4Ldl6df5GvlzcCEz",
    anual:  "price_1Te7qKRX4Ldl6df5F5dh32i7",
  },
};

const PRICES = {
  starter: { mensal: "R$ 97", anual: "R$ 77" },
  pro:     { mensal: "R$ 197", anual: "R$ 157" },
  agency:  { mensal: "R$ 397", anual: "R$ 317" },
};

const FEATURES_TABLE = [
  { label: "Clientes ativos",          starter: "Até 5",      pro: "Ilimitados",  agency: "Ilimitados" },
  { label: "Pipeline Kanban",          starter: true,          pro: true,          agency: true },
  { label: "Agenda de tarefas",        starter: true,          pro: true,          agency: true },
  { label: "Propostas + PDF",          starter: true,          pro: true,          agency: true },
  { label: "App mobile",               starter: true,          pro: true,          agency: true },
  { label: "Relatórios completos",     starter: false,         pro: true,          agency: true },
  { label: "Exportação de dados",      starter: false,         pro: true,          agency: true },
  { label: "Suporte prioritário",      starter: false,         pro: true,          agency: true },
  { label: "Múltiplas moedas no PDF",  starter: false,         pro: true,          agency: true },
  { label: "White-label (logo própria)",starter: false,        pro: false,         agency: true },
  { label: "Multi-usuário (3 seats)",  starter: false,         pro: false,         agency: true },
  { label: "API access",               starter: false,         pro: false,         agency: true },
  { label: "Onboarding dedicado",      starter: false,         pro: false,         agency: true },
];

const FAQS = [
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem multa ou fidelidade. Cancele quando quiser diretamente nas configurações." },
  { q: "O que acontece após o trial?", a: "Você escolhe um plano ou sua conta entra em modo pausa — seus dados ficam salvos." },
  { q: "Aceita cupom de desconto?", a: "Sim! Insira o código no checkout ao assinar qualquer plano." },
  { q: "Plano Agency suporta quantos usuários?", a: "Até 3 usuários simultâneos com acessos individuais à mesma conta." },
];

function FeatureCell({ value }) {
  if (value === true) return <Check className="w-4 h-4 text-green-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
  return <span className="text-xs font-mono text-primary font-semibold">{value}</span>;
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/50 transition-colors">
        <span className="font-medium text-sm text-foreground">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">{a}</div>}
    </div>
  );
}

export default function Plans() {
  const [billing, setBilling] = useState("mensal");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [toast, setToast] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("success")) {
      setToast({ type: "success", msg: "✓ Assinatura ativada! Bem-vindo ao Concierge OS." });
      setTimeout(() => setToast(null), 5000);
    } else if (params.get("canceled")) {
      setToast({ type: "info", msg: "Checkout cancelado. Você pode assinar quando quiser." });
      setTimeout(() => setToast(null), 4000);
    }
  }, []);

  const handleCheckout = async (planId) => {
    setLoadingPlan(planId);
    const price_id = PRICE_IDS[planId][billing];
    const res = await stripeCheckout({ price_id, plan_id: planId, cycle: billing });
    const url = res?.data?.url;
    if (url) {
      window.location.href = url;
    } else {
      setToast({ type: "error", msg: "Erro ao iniciar checkout. Tente novamente." });
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: "starter",
      name: "Starter",
      tagline: "Perfeito para começar",
      icon: Zap,
      highlight: false,
      features: ["Até 5 clientes ativos", "Pipeline Kanban", "Agenda de tarefas", "Propostas básicas + PDF", "App mobile"],
    },
    {
      id: "pro",
      name: "Pro",
      tagline: "Para quem quer escalar",
      icon: Star,
      highlight: true,
      features: ["Clientes ilimitados", "Tudo do Starter", "Relatórios completos", "Exportação de dados", "Suporte prioritário", "Múltiplas moedas no PDF"],
    },
    {
      id: "agency",
      name: "Agency",
      tagline: "Para agências e operações",
      icon: Crown,
      highlight: false,
      features: ["Tudo do Pro", "White-label (logo própria)", "Multi-usuário (3 seats)", "API access", "Onboarding dedicado"],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border ${
          toast.type === "success" ? "bg-green-500/15 border-green-500/30 text-green-400" :
          toast.type === "error" ? "bg-red-500/15 border-red-500/30 text-red-400" :
          "bg-secondary border-border text-foreground"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          Planos simples, sem surpresas
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
          Todos os planos incluem 7 dias grátis. Cancele quando quiser, sem multas.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 bg-secondary border border-border rounded-xl p-1 mt-6">
          <button
            onClick={() => setBilling("mensal")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billing === "mensal" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBilling("anual")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billing === "anual" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            Anual
            <span className="text-[10px] font-mono bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full">-20%</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loadingPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                plan.highlight
                  ? "border-primary bg-card shadow-lg shadow-primary/10 scale-[1.02]"
                  : "border-border bg-card/50 hover:border-primary/40"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    ✦ Mais popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${plan.highlight ? "bg-primary/20" : "bg-secondary"}`}>
                  <Icon className={`w-5 h-5 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">{plan.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
              </div>

              <div className="mb-5">
                <div className="flex items-end gap-1">
                  <span className="font-display text-3xl font-bold text-foreground">{PRICES[plan.id][billing]}</span>
                  <span className="text-muted-foreground text-sm mb-1">/mês</span>
                </div>
                {billing === "anual" && (
                  <p className="text-[11px] text-green-400 mt-0.5 font-mono">cobrado anualmente · 20% off</p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleCheckout(plan.id)}
                disabled={!!loadingPlan}
                variant={plan.highlight ? "default" : "outline"}
                className={`w-full gap-2 ${plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isLoading ? "Redirecionando..." : "Iniciar 7 dias grátis"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="mb-14">
        <h2 className="font-display text-xl font-bold text-foreground text-center mb-6">Comparativo completo</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Recurso</th>
                <th className="text-center px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Starter</th>
                <th className="text-center px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-primary bg-primary/5">Pro</th>
                <th className="text-center px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Agency</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES_TABLE.map((row, i) => (
                <tr key={row.label} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-secondary/20"}`}>
                  <td className="px-5 py-3 text-sm text-foreground/80">{row.label}</td>
                  <td className="px-4 py-3 text-center"><FeatureCell value={row.starter} /></td>
                  <td className="px-4 py-3 text-center bg-primary/5"><FeatureCell value={row.pro} /></td>
                  <td className="px-4 py-3 text-center"><FeatureCell value={row.agency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-display text-xl font-bold text-foreground text-center mb-6">Perguntas frequentes</h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10 font-mono">
        ✦ Pagamento seguro via Stripe · Sem contratos · Cancele a qualquer momento
      </p>
    </div>
  );
}