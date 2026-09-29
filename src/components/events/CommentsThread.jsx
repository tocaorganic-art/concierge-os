import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Thread de comentários internos do evento — mais novo primeiro.
export default function CommentsThread({ comentarios = [], onAdd, isPending }) {
  const [texto, setTexto] = useState("");

  const ordenados = [...comentarios].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

  const handleSend = async () => {
    if (!texto.trim()) return;
    await onAdd(texto);
    setTexto("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Adicionar comentário..."
          rows={2}
          className="bg-secondary border-border text-sm"
        />
        <Button type="button" size="icon" onClick={handleSend} disabled={isPending || !texto.trim()} className="self-end flex-shrink-0">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {ordenados.map((c, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-secondary/40 border border-border/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{c.autor_nome || "Equipe"}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {c.timestamp ? new Date(c.timestamp).toLocaleString("pt-BR") : ""}
                </span>
              </div>
              <p className="text-xs text-foreground/80 whitespace-pre-line">{c.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
