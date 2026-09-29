import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, MapPin, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function RequestModal({ tipo, user, onClose, onSubmit, isSubmitting }) {
  const { t } = useLanguage();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [destino, setDestino] = useState("");
  const [dataDesejada, setDataDesejada] = useState("");

  const placeholders = {
    experiencia: { titulo: t("request_modal_placeholder_titulo_experiencia"), descricao: t("request_modal_placeholder_descricao_experiencia") },
    reserva: { titulo: t("request_modal_placeholder_titulo_reserva"), descricao: t("request_modal_placeholder_descricao_reserva") },
    exclusivo: { titulo: t("request_modal_placeholder_titulo_exclusivo"), descricao: t("request_modal_placeholder_descricao_exclusivo") },
    ajuda: { titulo: t("request_modal_placeholder_titulo_ajuda"), descricao: t("request_modal_placeholder_descricao_ajuda") },
  };

  const ph = placeholders[tipo.id] || placeholders.experiencia;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    onSubmit({
      tipo: tipo.id,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      destino: destino.trim(),
      data_desejada: dataDesejada || undefined,
      client_nome: user?.full_name || "",
      client_email: user?.email || "",
      status: "novo",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-t-3xl md:rounded-2xl p-6 shadow-2xl z-10 mx-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <tipo.Icon className="w-8 h-8 text-primary" />
          <h2 className="font-heading text-xl font-bold text-foreground mt-2">{tipo.label}</h2>
          <p className="text-xs text-muted-foreground">{tipo.sub}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={ph.titulo}
              required
              autoFocus
            />
          </div>
          <div>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={ph.descricao}
              className="min-h-[90px] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder={t("request_modal_destino_placeholder")}
                className="pl-9"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dataDesejada}
                onChange={(e) => setDataDesejada(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={isSubmitting || !titulo.trim()}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isSubmitting ? t("request_modal_sending") : t("request_modal_submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}