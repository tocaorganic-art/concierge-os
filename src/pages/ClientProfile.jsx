import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Sparkles, Loader2, CheckCircle2 } from "lucide-react";

const VIAJA_COM = [
  { v: "sozinho", l: "Sozinho" },
  { v: "casal", l: "Casal" },
  { v: "familia_filhos", l: "Família com filhos" },
  { v: "grupo_amigos", l: "Grupo de amigos" },
  { v: "corporativo", l: "Corporativo" },
];
const HOSPEDAGEM = [
  { v: "hotel_luxo", l: "Hotel de luxo" },
  { v: "villa_privada", l: "Villa privada" },
  { v: "pousada", l: "Pousada boutique" },
  { v: "resort", l: "Resort all-inclusive" },
  { v: "airbnb", l: "Airbnb / Casa alugada" },
];

export default function ClientProfile() {
  const [user, setUser] = useState(null);
  const [memory, setMemory] = useState(null);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const mems = await base44.entities.ClientMemory.filter({ user_id: u.id });
      const m = mems?.[0] || null;
      setMemory(m);
      setForm(m ? { ...m } : { user_id: u.id, client_nome: u.full_name });
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) =>
      memory
        ? base44.entities.ClientMemory.update(memory.id, data)
        : base44.entities.ClientMemory.create(data),
    onSuccess: (updated) => {
      setMemory(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono px-3 py-1 rounded-full mb-3">
          <Crown className="w-3 h-3" /> Perfil Concierge
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {user?.full_name?.split(" ")[0] || "Meu perfil"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suas preferências ajudam o concierge a personalizar cada experiência
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>🍷</span> Preferências de consumo
          </h2>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bebidas preferidas</label>
            <Input value={form.preferencias_bebida || ""} onChange={(e) => set("preferencias_bebida", e.target.value)} placeholder="Ex: vinho tinto, gin, água com gás..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Restrições alimentares</label>
            <Input value={form.restricoes_alimentares || ""} onChange={(e) => set("restricoes_alimentares", e.target.value)} placeholder="Ex: vegetariano, sem glúten, alergia a frutos do mar..." />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>✈️</span> Perfil de viagem
          </h2>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Viajo com</label>
            <Select value={form.viaja_com || ""} onValueChange={(v) => set("viaja_com", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {VIAJA_COM.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hospedagem preferida</label>
            <Select value={form.tipo_hospedagem || ""} onValueChange={(v) => set("tipo_hospedagem", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {HOSPEDAGEM.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Destinos favoritos</label>
            <Input value={form.destinos_favoritos || ""} onChange={(e) => set("destinos_favoritos", e.target.value)} placeholder="Ex: Noronha, Trancoso, Maldivas..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Estilo de viagem</label>
            <Input value={form.estilos || ""} onChange={(e) => set("estilos", e.target.value)} placeholder="Ex: beach club, gastronomia, aventura, relax..." />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Para o concierge saber
          </h2>
          <Textarea
            value={form.observacoes || ""}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Outras preferências ou informações importantes para seu concierge pessoal..."
            className="min-h-[80px] resize-none"
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : null}
          {mutation.isPending ? "Salvando..." : saved ? "Preferências salvas!" : "Salvar preferências ✦"}
        </Button>
      </form>
    </div>
  );
}