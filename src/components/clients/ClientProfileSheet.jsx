import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pencil, Mail, Phone, MapPin, Calendar } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatBRL } from "@/lib/formatBRL";

export default function ClientProfileSheet({ client, onClose, onEdit }) {
  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals-client", client?.id],
    queryFn: () => base44.entities.Proposal.filter({ client_id: client?.id }, "-created_date", 50),
    enabled: !!client?.id,
  });

  if (!client) return null;

  return (
    <Sheet open={!!client} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="bg-card border-border w-[420px] overflow-y-auto">
        <SheetHeader className="mb-6 pr-8">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="font-display text-xl truncate">{client.nome}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(client)}
              aria-label="Editar cliente"
              title="Editar cliente"
              className="shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Contact Info */}
        <div className="space-y-3 mb-6">
          {client.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{client.email}</span>
            </div>
          )}
          {client.telefone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-mono">{client.telefone}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            {client.tipo && <StatusBadge status={client.tipo} />}
            {client.origem && (
              <span className="text-xs text-muted-foreground">Origem: {client.origem}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-secondary/50 rounded-lg p-4 border border-border">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Valor Total</p>
            <p className="font-display text-xl font-bold text-primary mt-1">
              {formatBRL(client.valor_total || 0)}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4 border border-border">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Propostas</p>
            <p className="font-display text-xl font-bold text-foreground mt-1">{proposals.length}</p>
          </div>
        </div>

        {/* Notes */}
        {client.notas && (
          <div className="mb-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Notas</p>
            <p className="text-sm text-foreground/80 bg-secondary/30 rounded-lg p-3 border border-border">
              {client.notas}
            </p>
          </div>
        )}

        {/* Proposal History */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Histórico de Viagens</p>
          <div className="space-y-2">
            {proposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{p.destino}</span>
                  </div>
                  {p.data_chegada && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.data_chegada).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <StatusBadge status={p.status} />
                  {p.valor > 0 && (
                    <p className="font-mono text-xs text-primary mt-1">
                      {formatBRL(p.valor)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {proposals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma proposta</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}