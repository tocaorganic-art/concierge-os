import React, { useState } from "react";
import { Check, X, Crown, Star, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import CheckoutModal from "@/components/monetization/CheckoutModal";

const PRICES = {
  starter: { monthly: { BRL: "R$ 97", USD: "$19", EUR: "€18" }, annual: { BRL: "R$ 77", USD: "$15", EUR: "€14" } },
  pro:     { monthly: { BRL: "R$ 197", USD: "$39", EUR: "€37" }, annual: { BRL: "R$ 157", USD: "$31", EUR: "€30" } },
  agency:  { monthly: { BRL: "R$ 397", USD: "$79", EUR: "€75" }, annual: { BRL: "R$ 317", USD: "$63", EUR: "€60" } },
};

const FEATURES_TABLE = [
  { label: "Clientes ativos", starter: "Até 5", pro: "Ilimitados", agency: "Ilimitados" },
  { label: "Pipeline Kanban", starter: true, pro: true, agency: true },
  { label: "Agenda de tarefas", starter: true, pro: true, agency: true },
  { label: "Propostas + PDF", starter: true, pro: true, agency: true },
  { label: "App mobile", starter: true, pro: true, agency: true },
  { label: "Relatórios completos", starter: false, pro: true, agency: true },
  { label: "Exportação de dados", starter: false, pro: true, agency: true },
  { label: "Suporte prioritário", starter: false, pro: true, agency: true },
  { label: "Múltiplas moedas no PDF", starter: false, pro: true, agency: true },
  { label: "White-label (logo própria)", starter: false, pro: false, agency: true },
  { label: "Multi-usuário (3 seats)", starter: false, pro: false, agency: true },
  { label: "API access", starter: false, pro: false, agency: true },
  { label: "Onboarding dedicado", starter: false, pro: false, agency: true },
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
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/50 transition-colors"
      >
        <span className="font-medium text-sm text-foreground">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">{a}</div>
      )}
    </div>
  );
}

export default function Plans() {
  const { lang } = useLanguage();
  const currency = lang === "en" ? "USD" : lang === "es" ? "EUR" : "BRL";
  const [billing, setBilling] = useState("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  const price = (plan) => PRICES[plan][billing][currency];

  const plans = [
    {
      id: "starter",
      name: "Starter",
      tagline: "Perfeito para começar",
      icon: Zap,
      highlight: false,
      cta: "Iniciar 7 dias grátis",
      ctaVariant: "outline",
      features: [
        "Até 5 clientes ativos",
        "Pipeline Kanban",
        "Agenda de tarefas",
        "Propostas básicas + PDF",
        "App mobile",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      tagline: "Para quem quer escalar",
      icon: Star,
      highlight: true,
      cta: "Iniciar 7 dias grátis",
      ctaVariant: "default",
      features: [
        "Clientes ilimitados",
        "Tudo do Starter",
        "Relatórios completos",
        "Exportação de dados",
        "Suporte prioritário",
        "Múltiplas moedas no PDF",
      ],
    },
    {
      id: "agency",
      name: "Agency",
      tagline: "Para agências e operações",
      icon: Crown,
      highlight: false,
      cta: "Falar com vendas",
      ctaVariant: "outline",
      features: [
        "Tudo do Pro",
        "White-label (logo própria)",
        "Multi-usuário (3 seats)",
        "API access",
        "Onboarding dedicado",
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          Planos simples, sem surpresas
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
          Todos os planos incluem 7 dias grátis. Cancele quando quiser, sem multas.
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center gap-1 bg-secondary border border-border rounded-xl p-1 mt-6">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billing === "monthly" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billing === "annual" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
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
                  <span className="font-display text-3xl font-bold text-foreground">{price(plan.id)}</span>
                  <span className="text-muted-foreground text-sm mb-1">/mês</span>
                </div>
                {billing === "annual" && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">cobrado anualmente</p>
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
                onClick={() => setCheckoutPlan(plan.id)}
                variant={plan.highlight ? "default" : "outline"}
                className={`w-full ${plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              >
                {plan.cta}
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

      {/* Trust badge */}
      <p className="text-center text-xs text-muted-foreground mt-10 font-mono">
        ✦ Pagamento seguro · Sem contratos · Cancele a qualquer momento
      </p>

      <CheckoutModal
        open={!!checkoutPlan}
        onOpenChange={(v) => !v && setCheckoutPlan(null)}
        plan={checkoutPlan}
        billingCycle={billing}
        price={checkoutPlan ? price(checkoutPlan) : ""}
      />
    </div>
  );
}