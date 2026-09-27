import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Overlay that locks content for users without the required plan
export default function PlanGate({ children, locked, planName = "Pro", title, description }) {
  const navigate = useNavigate();

  if (!locked) return children;

  return (
    <div className="relative min-h-[400px]">
      {/* Blurred content */}
      <div className="pointer-events-none select-none opacity-30 blur-sm">{children}</div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10">
        <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-sm shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-heading text-lg font-bold text-foreground mb-2">
            {title || `Disponível no Plano ${planName}`}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            {description || `Faça upgrade para o Plano ${planName} para desbloquear este recurso.`}
          </p>
          <Button
            onClick={() => navigate("/planos")}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            Fazer Upgrade <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}