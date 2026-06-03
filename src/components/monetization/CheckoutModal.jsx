import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { stripeCheckout } from "@/functions/stripeCheckout";

const PRICE_IDS = {
  starter: { monthly: "price_1Te3cXRX4Ldl6df5IAh3yfD1", annual: "price_1Te3cYRX4Ldl6df5cHN3kxVi" },
  pro:     { monthly: "price_1Te3cYRX4Ldl6df5SQnau1tk", annual: "price_1Te3cYRX4Ldl6df5uIFG7JdT" },
  agency:  { monthly: "price_1Te3cYRX4Ldl6df5mOBWn42n", annual: "price_1Te3cZRX4Ldl6df5hyAyMxC9" },
};

const PRICES = {
  starter: { monthly: "R$ 97", annual: "R$ 77" },
  pro:     { monthly: "R$ 197", annual: "R$ 157" },
  agency:  { monthly: "R$ 397", annual: "R$ 317" },
};

const planLabels = { starter: "Starter", pro: "Pro", agency: "Agency" };

export default function CheckoutModal({ open, onOpenChange, plan, billingCycle }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cycle = billingCycle === "anual" ? "annual" : "monthly";
  const price = plan ? PRICES[plan]?.[cycle] : null;
  const priceId = plan ? PRICE_IDS[plan]?.[cycle] : null;

  const handleCheckout = async () => {
    if (!priceId) return;
    setLoading(true);
    setError(null);
    const res = await stripeCheckout({ price_id: priceId, plan_id: plan, cycle });
    const url = res?.data?.url;
    if (url) {
      window.location.href = url;
    } else {
      setError("Erro ao iniciar checkout. Tente novamente.");
      setLoading(false);
    }
  };

  const handleClose = (v) => {
    if (!loading) {
      setError(null);
      onOpenChange(v);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            Iniciar trial gratuito
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">7 dias grátis. Sem cartão de crédito.</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {plan && price && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <span className="font-semibold text-foreground">{planLabels[plan]}</span>
              <span className="font-display text-lg font-bold text-primary">
                {price}<span className="text-xs text-muted-foreground font-normal">/mês</span>
              </span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <Button
            onClick={handleCheckout}
            disabled={loading || !priceId}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-11"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Redirecionando para o Stripe..." : "Começar agora · 7 dias grátis"}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade. Sem compromisso.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}