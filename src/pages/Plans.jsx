import React, { useState } from "react";
import { Star, Check, Zap, Building2, Crown, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 97",
    period: "/mês",
    icon: Zap,
    popular: false,
    description: "Perfeito para começar",
    features: [
      "Até 5 clientes ativos",
      "Pipeline de vendas",
      "Agenda de tarefas",
      "Propostas básicas",
      "Suporte por email",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 197",
    period: "/mês",
    icon: Star,
    popular: true,
    description: "O favorito dos concierges",
    features: [
      "Clientes ilimitados",
      "Pipeline completo com D&D",
      "PDF de proposta premium",
      "Relatórios completos",
      "Faturamento e cobranças",
      "Suporte prioritário",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    price: "R$ 397",
    period: "/mês",
    icon: Building2,
    popular: false,
    description: "Para operações maiores",
    features: [
      "Tudo do plano Pro",
      "Multi-usuário",
      "White-label",
      "API access",
      "Onboarding dedicado",
      "SLA garantido",
    ],
  },
];

function WaitlistModal({ plan, onClose }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Em breve</h2>
          <p className="text-muted-foreground text-sm">
            O plano <strong className="text-primary">{plan.name}</strong> estará disponível em breve. Entre na lista de espera e seja o primeiro a saber!
          </p>
        </div>
        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-foreground font-medium">Você está na lista!</p>
            <p className="text-muted-foreground text-sm mt-1">Entraremos em contato em breve.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              onClick={() => email && setSubmitted(true)}
            >
              Entrar na lista de espera
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Plans() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <div>
      <PageHeader
        title="Planos"
        subtitle="Escolha o plano ideal para sua operação"
      />

      {/* Intro */}
      <p className="text-muted-foreground text-sm mb-8 max-w-xl">
        Todos os planos incluem período de teste de 7 dias. Cancele quando quiser, sem multas.
      </p>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                plan.popular
                  ? "border-primary/60 bg-primary/5 shadow-xl shadow-primary/10"
                  : "border-border bg-card gold-border-hover"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-[11px] font-mono uppercase tracking-wider px-3 py-1 rounded-full font-bold">
                    ✦ Mais popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular ? "bg-primary/20" : "bg-secondary"}`}>
                  <Icon className={`w-5 h-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="font-display text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => setSelectedPlan(plan)}
                className={`w-full font-semibold ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                Assinar {plan.name}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Trust note */}
      <p className="text-xs text-muted-foreground mt-8 text-center max-w-md mx-auto">
        ✦ Pagamento seguro · Sem contratos · Cancele a qualquer momento
      </p>

      {selectedPlan && (
        <WaitlistModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}
    </div>
  );
}