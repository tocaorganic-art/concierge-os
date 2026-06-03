import React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Sparkles, CheckCircle2, XCircle } from "lucide-react";

const TIPOS = {
  experiencia: { emoji: "🏝️", label: "Experiência" },
  reserva:     { emoji: "🍽️", label: "Reserva" },
  exclusivo:   { emoji: "🚁", label: "Exclusivo" },
  ajuda:       { emoji: "🆘", label: "Urgente" },
};

const STATUS = {
  novo:         { label: "Aguardando",    icon: Clock,        cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  em_andamento: { label: "Em andamento",  icon: Sparkles,     cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  resolvido:    { label: "Resolvido",     icon: CheckCircle2, cls: "bg-green-500/10 text-green-400 border-green-500/20" },
  cancelado:    { label: "Cancelado",     icon: XCircle,      cls: "bg-muted text-muted-foreground border-border" },
};

export default function RequestHistory({ requests }) {
  return (
    <div>
      <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Meus pedidos</h2>
      <div className="space-y-2">
        {requests.map((req) => {
          const tipo = TIPOS[req.tipo] || TIPOS.ajuda;
          const status = STATUS[req.status] || STATUS.novo;
          const StatusIcon = status.icon;
          return (
            <div key={req.id} className="bg-card/60 border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="text-xl flex-shrink-0">{tipo.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{req.titulo}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {req.created_date ? format(new Date(req.created_date), "dd MMM 'às' HH:mm", { locale: ptBR }) : ""}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] font-mono flex items-center gap-1 flex-shrink-0 ${status.cls}`}>
                  <StatusIcon className="w-3 h-3" />{status.label}
                </Badge>
              </div>
              {req.resposta_concierge && (
                <div className="mt-3 bg-primary/5 border border-primary/15 rounded-lg p-3 text-xs text-foreground/80">
                  <span className="text-primary font-mono text-[9px] uppercase tracking-wider block mb-1">✦ Resposta do concierge</span>
                  {req.resposta_concierge}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}