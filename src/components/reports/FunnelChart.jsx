import React from "react";
import { ArrowDown } from "lucide-react";

export default function FunnelChart({ proposals }) {
  const stages = [
    { key: "lead",       label: "Lead",       color: "bg-blue-500" },
    { key: "proposta",   label: "Proposta",   color: "bg-amber-500" },
    { key: "confirmado", label: "Confirmado", color: "bg-green-500" },
    { key: "concluido",  label: "Concluído",  color: "bg-primary" },
  ];

  const counts = stages.map((s) => ({
    ...s,
    count: proposals.filter((p) => p.status === s.key).length,
  }));

  const total = proposals.length || 1;

  return (
    <div className="space-y-3">
      {counts.map((stage, i) => {
        const pct = Math.round((stage.count / total) * 100);
        const prevCount = i === 0 ? total : counts[i - 1].count || 1;
        const conversion = i === 0 ? null : prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0;
        return (
          <div key={stage.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground">{stage.label}</span>
              <div className="flex items-center gap-3">
                {conversion !== null && (
                  <span className="inline-flex items-center gap-0.5 font-mono text-xs text-muted-foreground"><ArrowDown className="w-3 h-3" /> {conversion}%</span>
                )}
                <span className="font-mono text-sm font-bold text-foreground">{stage.count}</span>
              </div>
            </div>
            <div className="h-7 bg-secondary rounded-lg overflow-hidden">
              <div
                className={`h-full ${stage.color} rounded-lg transition-all flex items-center justify-end pr-2`}
                style={{ width: `${Math.max(pct, 4)}%` }}
              >
                {pct >= 10 && <span className="text-[10px] font-mono font-bold text-white">{pct}%</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}