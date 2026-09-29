import React, { useState } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { formatHistoryEntry } from "@/hooks/useEventHistory";

// Timeline de mudanças do evento (Task.historico) — mais recente primeiro,
// colapsada por padrão (mostra as 3 últimas) para não poluir o modal.
export default function EventTimeline({ historico = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (historico.length === 0) {
    return <p className="text-xs text-muted-foreground">Sem histórico de edições ainda.</p>;
  }

  const ordenado = [...historico].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  const visiveis = expanded ? ordenado : ordenado.slice(0, 3);

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {visiveis.map((entry, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <History className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{formatHistoryEntry(entry)}</span>
          </li>
        ))}
      </ul>
      {ordenado.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Ver menos" : `Ver todas (${ordenado.length})`}
        </button>
      )}
    </div>
  );
}
