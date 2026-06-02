import React, { useState } from "react";
import { Star, Check, Zap, Building2, Crown, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import { useLanguage } from "@/lib/i18n";

const planPrices = {
  starter: { "pt-BR": "R$ 97", en: "$19", es: "€18" },
  pro:     { "pt-BR": "R$ 197", en: "$39", es: "€37" },
  agency:  { "pt-BR": "R$ 397", en: "$79", es: "€75" },
};

function WaitlistModal({ plan, onClose, t }) {
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
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">{t("plans_coming_soon")}</h2>
          <p className="text-muted-foreground text-sm">
            <strong className="text-primary">{plan.name}</strong> {t("plans_waitlist_desc")}
          </p>
        </div>
        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-foreground font-medium">{t("plans_on_list")}</p>
            <p className="text-muted-foreground text-sm mt-1">{t("plans_contact_soon")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 bg-secondary border-border" />
            </div>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" onClick={() => email && setSubmitted(true)}>
              {t("plans_waitlist_cta")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Plans() {
  const { t, lang } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      id: "starter",
      name: "Starter",
      icon: Zap,
      popular: false,
      description: t("plan_starter_desc"),
      features: [
        t("plan_feature_clients_5"),
        t("plan_feature_pipeline"),
        t("plan_feature_schedule"),
        t("plan_feature_proposals_basic"),
        t("plan_feature_email_support"),
      ],
    },
    {
      id: "pro",
      name: "Pro",
      icon: Star,
      popular: true,
      description: t("plan_pro_desc"),
      features: [
        t("plan_feature_unlimited_clients"),
        t("plan_feature_pipeline_dnd"),
        t("plan_feature_pdf"),
        t("plan_feature_reports"),
        t("plan_feature_billing"),
        t("plan_feature_priority_support"),
      ],
    },
    {
      id: "agency",
      name: "Agency",
      icon: Building2,
      popular: false,
      description: t("plan_agency_desc"),
      features: [
        t("plan_feature_pro_all"),
        t("plan_feature_multiuser"),
        t("plan_feature_whitelabel"),
        t("plan_feature_api"),
        t("plan_feature_onboarding"),
        t("plan_feature_sla"),
      ],
    },
  ];

  return (
    <div>
      <PageHeader title={t("plans_title")} subtitle={t("plans_subtitle")} />

      <p className="text-muted-foreground text-sm mb-8 max-w-xl">{t("plans_trial_note")}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const price = planPrices[plan.id][lang] || planPrices[plan.id]["pt-BR"];
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
                    ✦ {t("plans_most_popular")}
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
                <span className="font-display text-3xl font-bold text-foreground">{price}</span>
                <span className="text-muted-foreground text-sm">{t("plans_per_month")}</span>
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
                {t("plans_subscribe")} {plan.name}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-8 text-center max-w-md mx-auto">
        ✦ {t("plans_trust")}
      </p>

      {selectedPlan && (
        <WaitlistModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} t={t} />
      )}
    </div>
  );
}