import React from "react";
import StatusBadge from "@/components/shared/StatusBadge";
import { MapPin } from "lucide-react";

const stages = [
  { key: "lead", label: "Lead", color: "bg-blue-500" },
  { key: "proposta", label: "Proposta", color: "bg-amber-500" },
  { key: "confirmado", label: "Confirmado", color: "bg-green-500" },
  { key: "concluido", label: "Concluído", color: "bg-primary" },
];

export default function DashboardPipeline({ proposals }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-display text-lg font-semibold text-foreground mb-4">Pipeline</h3>
      <div className="grid grid-cols-4 gap-3">
        {stages.map((stage) => {
          const items = proposals.filter((p) => p.status === stage.key);
          return (
            <div key={stage.key}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {stage.label}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground ml-auto">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="bg-secondary/50 border border-border rounded-lg p-3 text-xs"
                  >
                    <p className="font-medium text-foreground truncate">{p.client_nome}</p>
                    <div className="flex items-center gap-1 text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{p.destino}</span>
                    </div>
                    {p.valor > 0 && (
                      <p className="font-mono text-primary text-[11px] mt-1">
                        R$ {p.valor?.toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}