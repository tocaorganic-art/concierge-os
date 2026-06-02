import React from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

export default function TrialBanner({ daysLeft, onDismiss }) {
  if (daysLeft === null) return null;

  const expired = daysLeft <= 0;

  return (
    <div className={`relative flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium ${
      expired ? "bg-red-500/15 border-b border-red-500/30 text-red-300" : "bg-primary/10 border-b border-primary/25 text-foreground"
    }`}>
      <span className="text-primary">✦</span>
      {expired ? (
        <span>Seu período de teste encerrou. <Link to="/planos" className="underline text-primary font-semibold">Escolha um plano</Link> para continuar.</span>
      ) : (
        <span>
          Você está no período de teste —{" "}
          <strong className="text-primary">{daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}</strong>.{" "}
          <Link to="/planos" className="underline text-primary hover:text-primary/80 transition-colors">Ver Planos</Link>
        </span>
      )}
      {!expired && onDismiss && (
        <button onClick={onDismiss} className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}