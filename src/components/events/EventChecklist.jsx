import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildChecklistFromTemplate } from "@/lib/eventChecklistTemplates";

// Checklist de sub-tarefas do evento. Se o checklist estiver vazio, oferece
// aplicar o template do tipo do evento (src/lib/eventChecklistTemplates.js)
// — nunca sobrescreve itens já existentes.
export default function EventChecklist({ checklist = [], tipo, onChange, disabled }) {
  const [novoItem, setNovoItem] = useState("");

  const concluidos = checklist.filter((i) => i.concluido).length;
  const total = checklist.length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  const toggle = (id) => {
    onChange(checklist.map((i) => (i.id === id ? { ...i, concluido: !i.concluido, timestamp: new Date().toISOString() } : i)));
  };

  const remove = (id) => onChange(checklist.filter((i) => i.id !== id));

  const addItem = () => {
    if (!novoItem.trim()) return;
    onChange([
      ...checklist,
      { id: `item-${Date.now()}`, titulo: novoItem.trim(), concluido: false, timestamp: new Date().toISOString() },
    ]);
    setNovoItem("");
  };

  const applyTemplate = () => onChange(buildChecklistFromTemplate(tipo));

  return (
    <div className="space-y-3">
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-1">
            <span>{concluidos} de {total} concluídas</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {total === 0 && tipo && (
        <Button type="button" variant="outline" size="sm" onClick={applyTemplate}>
          Usar checklist padrão de "{tipo}"
        </Button>
      )}

      <div className="space-y-1.5">
        {checklist.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <Checkbox checked={item.concluido} onCheckedChange={() => toggle(item.id)} disabled={disabled} />
            <span className={`flex-1 text-sm ${item.concluido ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.titulo}
            </span>
            <button type="button" onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          placeholder="Nova sub-tarefa..."
          className="h-8 text-sm bg-secondary border-border"
        />
        <Button type="button" size="icon" variant="outline" className="h-8 w-8 flex-shrink-0" onClick={addItem}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
