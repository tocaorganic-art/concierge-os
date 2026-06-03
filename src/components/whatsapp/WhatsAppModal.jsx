import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Sparkles, Loader2, Copy, ExternalLink } from "lucide-react";
import { generateWithAI } from "@/functions/generateWithAI";

const TEMPLATES = [
  { id: "confirmar_chegada", label: "Confirmar chegada" },
  { id: "enviar_proposta", label: "Enviar proposta" },
  { id: "followup_viagem", label: "Follow-up pós-viagem" },
  { id: "solicitar_avaliacao", label: "Solicitar avaliação" },
];

const AiBadge = () => (
  <span className="inline-flex items-center gap-1 bg-primary/15 text-primary text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-primary/20 ml-2">✦ IA</span>
);

export default function WhatsAppModal({ open, onOpenChange, client_nome, telefone, context = "" }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [customContext, setCustomContext] = useState(context);
  const [copied, setCopied] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);

  const handleGenerate = async (template = null) => {
    setLoading(true);
    setActiveTemplate(template);
    const res = await generateWithAI({
      type: "whatsapp",
      payload: {
        template: template || "custom",
        client_nome: client_nome || "Cliente",
        context: customContext,
      },
    });
    setLoading(false);
    const result = res?.data?.result;
    if (result) setMessage(result);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    const phone = (telefone || "").replace(/\D/g, "");
    const text = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const canSend = telefone && message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center">
            <MessageCircle className="w-5 h-5 text-green-400 mr-2" />
            Mensagem WhatsApp <AiBadge />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {client_nome && (
            <p className="text-sm text-muted-foreground">Para: <span className="text-foreground font-medium">{client_nome}</span></p>
          )}

          {/* Quick templates */}
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Templates rápidos</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-start gap-1.5 h-8"
                  onClick={() => handleGenerate(t.id)}
                  disabled={loading}
                >
                  {loading && activeTemplate === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom context */}
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Contexto livre</Label>
            <div className="flex gap-2 mt-1.5">
              <Textarea
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                className="bg-secondary border-border text-sm"
                rows={2}
                placeholder="Descreva o objetivo da mensagem..."
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate(null)}
              disabled={loading || !customContext}
              className="mt-2 gap-2 w-full"
            >
              {loading && !activeTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
              Gerar mensagem com IA
            </Button>
          </div>

          {/* Generated message */}
          {message && (
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Mensagem gerada</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1.5 bg-secondary border-border text-sm"
                rows={5}
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {message && (
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                <Copy className="w-3.5 h-3.5" /> {copied ? "Copiado!" : "Copiar"}
              </Button>
            )}
            {canSend && (
              <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700 text-white gap-2 flex-1">
                <ExternalLink className="w-4 h-4" /> Abrir no WhatsApp
              </Button>
            )}
            {!telefone && message && (
              <p className="text-xs text-muted-foreground self-center">Sem telefone cadastrado — copie a mensagem</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}