import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2 } from "lucide-react";

export default function RequestModal({ tipo, user, onClose, onSubmit, isSubmitting }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [destino, setDestino] = useState("");
  const [dataDesejada, setDataDesejada] = useState("");

  const placeholders = {
    experiencia: { titulo: "Ex: Passeio de barco ao pôr do sol em Noronha", descricao: "Conte mais detalhes: grupo, preferências, orçamento..." },
    reserva:     { titulo: "Ex: Jantar romântico em restaurante à beira-mar",  descricao: "Número de pessoas, restrições alimentares, horário preferido..." },
    exclusivo:   { titulo: "Ex: Helicóptero do Rio para Angra dos Reis",        descricao: "Data, número de passageiros, necessidades especiais..." },
    ajuda:       { titulo: "Ex: Passei mal e preciso de auxílio médico",        descricao: "Descreva a situação e onde você está..." },
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
          <span className="text-3xl">{tipo.emoji}</span>
          <h2 className="font-display text-xl font-bold text-foreground mt-2">{tipo.label}</h2>
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
            <div>
              <Input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="📍 Destino / Local"
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
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? "Enviando..." : "Enviar pedido ✦"}
          </Button>
        </form>
      </div>
    </div>
  );
}