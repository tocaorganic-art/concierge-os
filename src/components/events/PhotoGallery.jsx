import React, { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

// Galeria horizontal das fotos do evento, com legenda editável inline
// (salva ao sair do campo — onBlur) e botão de remover por foto.
export default function PhotoGallery({ fotos = [], onUpdateLegenda, onRemove }) {
  const [editing, setEditing] = useState({});

  if (fotos.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma foto adicionada ainda.</p>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {fotos.map((foto, index) => (
        <div key={foto.url + index} className="flex-shrink-0 w-32">
          <div className="relative group">
            <img
              src={foto.url}
              alt={foto.legenda || `Foto ${index + 1}`}
              className="w-32 h-32 object-cover rounded-lg border border-border bg-secondary"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remover foto"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <Input
            value={editing[index] ?? foto.legenda ?? ""}
            placeholder="Legenda..."
            onChange={(e) => setEditing((s) => ({ ...s, [index]: e.target.value }))}
            onBlur={(e) => {
              if (e.target.value !== (foto.legenda || "")) onUpdateLegenda(index, e.target.value);
            }}
            className="mt-1.5 h-7 text-[11px] bg-secondary border-border"
          />
        </div>
      ))}
    </div>
  );
}
