import React from "react";
import { Clock, Settings, CheckCircle2 } from "lucide-react";

// Badge de status especifico do modal de eventos (Task.status: pendente |
// em_progresso | concluido). Deliberadamente separado do <StatusBadge>
// compartilhado (que ja usa "pendente"/"concluido" com outras cores em
// Faturamento/Propostas) para nao alterar nada existente — este componente
// e novo e so e usado dentro de src/components/events/.
const CONFIG = {
  pendente: {
    label: "Pendente",
    icon: Clock,
    className: "bg-muted text-muted-foreground border-border",
  },
  em_progresso: {
    label: "Em progresso",
    icon: Settings,
    className: "bg-warning/15 text-warning border-warning/30",
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle2,
    className: "bg-success/15 text-success border-success/30",
  },
};

export default function EventStatusBadge({ status, className = "" }) {
  const config = CONFIG[status] || CONFIG.pendente;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${config.className} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export { CONFIG as EVENT_STATUS_CONFIG };
