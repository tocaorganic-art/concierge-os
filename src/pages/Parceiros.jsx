import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MapPin, Phone, Percent, Pencil, Trash2 } from "lucide-react";
import PartnerFormDialog from "@/components/partners/PartnerFormDialog";

const CATS = {
  restaurante: { emoji: "🍽️", label: "Restaurante" },
  passeio:     { emoji: "🏝️", label: "Passeio" },
  transfer:    { emoji: "🚗", label: "Transfer" },
  hospedagem:  { emoji: "🏨", label: "Hospedagem" },
  evento:      { emoji: "🎭", label: "Evento" },
  outros:      { emoji: "✦",  label: "Outros" },
};

export default function Parceiros() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: () => base44.entities.Partner.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Partner.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partners"] }),
  });

  const filtered = partners.filter((p) => {
    const matchSearch = !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.cidade?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "todos" || p.categoria === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Parceiros</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Rede de fornecedores e parceiros</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Novo parceiro
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar parceiro..." className="pl-9" />
        </div>
        <div className="flex gap-1 bg-secondary/50 border border-border rounded-xl p-1 flex-wrap">
          {["todos", ...Object.keys(CATS)].map((c) => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${catFilter === c ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
              {c === "todos" ? "Todos" : CATS[c]?.emoji + " " + CATS[c]?.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-4xl mb-3">🤝</div>
          <p className="text-sm">Nenhum parceiro cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const cat = CATS[p.categoria] || CATS.outros;
            return (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-5 gold-border-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{p.nome}</h3>
                      <Badge variant="outline" className="text-[10px] font-mono mt-1">{cat.label}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(p); setDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {p.cidade && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{p.cidade}{p.estado ? `, ${p.estado}` : ""}</div>}
                  {p.telefone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{p.telefone}</div>}
                  {p.comissao_pct && <div className="flex items-center gap-1.5"><Percent className="w-3 h-3" />{p.comissao_pct}% comissão</div>}
                  {p.descricao && <p className="text-foreground/60 line-clamp-2 mt-2">{p.descricao}</p>}
                </div>
                {!p.ativo && <Badge variant="outline" className="mt-3 text-[10px] text-muted-foreground">Inativo</Badge>}
              </div>
            );
          })}
        </div>
      )}

      <PartnerFormDialog open={dialogOpen} partner={editing} onClose={() => setDialogOpen(false)} />
    </div>
  );
}