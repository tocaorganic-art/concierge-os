import React from "react";
import { AlertTriangle } from "lucide-react";

// Alertas operacionais/financeiros derivados de clausulas do contrato deste
// evento (capacidade, checkout, restricoes de barulho, risco fiscal etc.) —
// entrada manual por proposta (Proposal.alertas_contratuais), admin-only.
export default function AlertasContratuais({ alertas = [] }) {
  if (alertas.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-xs font-mono uppercase tracking-wider text-amber-400">Alertas do contrato</span>
      </div>
      <ul className="divide-y divide-amber-500/10">
        {alertas.map((a, i) => (
          <li key={i} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-foreground">{a.titulo}</p>
              {a.valor_estimado > 0 && (
                <span className="text-xs font-mono text-amber-400 flex-shrink-0">
                  R$ {a.valor_estimado.toLocaleString("pt-BR")}
                </span>
              )}
            </div>
            {a.descricao && <p className="text-[11px] text-muted-foreground mt-1">{a.descricao}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
