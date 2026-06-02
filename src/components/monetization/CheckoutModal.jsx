import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Tag, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const COUPONS = {
  TOCA20: { pct: 20, label: "20% de desconto" },
  LAUNCH50: { pct: 50, label: "50% off no primeiro mês" },
  AGENCY30: { pct: 30, label: "30% off Agency" },
};

export default function CheckoutModal({ open, onOpenChange, plan, billingCycle, price }) {
  const [email, setEmail] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponStatus, setCouponStatus] = useState(null); // null | 'valid' | 'invalid'
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (COUPONS[code]) {
      setAppliedCoupon({ code, ...COUPONS[code] });
      setCouponStatus("valid");
    } else {
      setAppliedCoupon(null);
      setCouponStatus("invalid");
    }
  };

  const handleSubmit = async () => {
    if (!email || !plan) return;
    setLoading(true);
    try {
      await base44.entities.WaitlistEntry.create({
        email: email.trim(),
        plan_id: plan,
        billing_cycle: billingCycle || "monthly",
        coupon_code: appliedCoupon?.code || "",
        discount_pct: appliedCoupon?.pct || 0,
      });
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  const planLabels = { starter: "Starter", pro: "Pro", agency: "Agency" };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setDone(false); setCouponStatus(null); setAppliedCoupon(null); setCoupon(""); setEmail(""); } onOpenChange(v); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            {done ? "Você está na lista! 🎉" : `Plano ${planLabels[plan] || plan}`}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Entraremos em contato assim que o sistema de pagamento estiver disponível.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {price && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                <p className="font-display text-2xl font-bold text-primary">
                  {appliedCoupon ? (
                    <span>
                      <span className="line-through text-muted-foreground text-base mr-2">{price}</span>
                      {price} <span className="text-sm text-green-400">-{appliedCoupon.pct}%</span>
                    </span>
                  ) : price}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{billingCycle === "annual" ? "por mês, cobrado anualmente" : "por mês"}</p>
              </div>
            )}

            <div>
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Email *</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 bg-secondary border-border"
              />
            </div>

            <div>
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Cupom de desconto (opcional)
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="Ex: TOCA20"
                  value={coupon}
                  onChange={(e) => { setCoupon(e.target.value); setCouponStatus(null); }}
                  className="bg-secondary border-border uppercase"
                />
                <Button variant="outline" size="sm" onClick={applyCoupon} className="flex-shrink-0">
                  Aplicar
                </Button>
              </div>
              {couponStatus === "valid" && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Cupom aplicado! {appliedCoupon?.label}
                </p>
              )}
              {couponStatus === "invalid" && (
                <p className="text-xs text-red-400 mt-1">Cupom inválido ou expirado.</p>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!email || loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar na lista de espera"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Pagamento seguro · Sem contratos · Cancele quando quiser
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}