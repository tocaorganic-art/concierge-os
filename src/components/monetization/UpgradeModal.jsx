import React from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight } from "lucide-react";

export default function UpgradeModal({ open, onOpenChange, title, description, requiredPlan = "Pro" }) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border text-center p-8">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Crown className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <Button
          onClick={() => { onOpenChange(false); navigate("/planos"); }}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          Ver Planos <ArrowRight className="w-4 h-4" />
        </Button>
        <button
          onClick={() => onOpenChange(false)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Fechar
        </button>
      </DialogContent>
    </Dialog>
  );
}