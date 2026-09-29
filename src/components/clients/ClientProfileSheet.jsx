import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Mail, Phone, MapPin, Calendar, Send, Link as LinkIcon, Eye, Loader2, Check } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatBRL } from "@/lib/formatBRL";

const APP_URL = "https://tocaconciergeos.base44.app";

export default function ClientProfileSheet({ client, onClose, onEdit }) {
  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals-client", client?.id],
    queryFn: () => base44.entities.Proposal.filter({ client_id: client?.id }, "-created_date", 50),
    enabled: !!client?.id,
  });

  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);

  const handleResendWelcome = async () => {
    if (!client?.id || sending) return;
    setSending(true);
    setSentOk(false);
    try {
      await base44.functions.invoke("sendWelcomeEmail", { client_id: client.id });
      setSentOk(true);
      setTimeout(() => setSentOk(false), 3000);
    } catch {
      // erro silencioso — botão volta ao estado normal, admin pode tentar de novo
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — ignora silenciosamente
    }
  };

  const handlePreview = async () => {
    if (!client?.id || previewLoading) return;
    setPreviewLoading(true);
    try {
      const res = await base44.functions.invoke("sendWelcomeEmail", { client_id: client.id, preview: true });
      setPreviewHtml(res?.data?.html || null);
    } catch {
      setPreviewHtml(null);
    } finally {
      setPreviewLoading(false);
    }
  };

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

        {/* Acesso ao Portal */}
        {client.email && (
          <div className="mb-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Acesso ao Portal</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleResendWelcome} disabled={sending}>
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sentOk ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                {sentOk ? "Enviado!" : "Reenviar boas-vindas"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyLink}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                {copied ? "Copiado!" : "Copiar link de acesso"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                Pré-visualizar email
              </Button>
            </div>
            {client.welcome_email_sent_at && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Último envio: {new Date(client.welcome_email_sent_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        )}

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

      <Dialog open={!!previewHtml} onOpenChange={(v) => !v && setPreviewHtml(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Pré-visualização — email de boas-vindas</DialogTitle>
          </DialogHeader>
          {previewHtml && (
            <iframe
              title="Pré-visualização do email de boas-vindas"
              srcDoc={previewHtml}
              className="w-full h-[70vh] rounded-lg border border-border bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}