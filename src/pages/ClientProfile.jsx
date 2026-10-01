import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Sparkles, Loader2, CheckCircle2, Wine, Plane } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";

function getViajaCom(t) {
  return [
    { v: "sozinho", l: t("profile_viaja_sozinho") },
    { v: "casal", l: t("profile_viaja_casal") },
    { v: "familia_filhos", l: t("profile_viaja_familia_filhos") },
    { v: "grupo_amigos", l: t("profile_viaja_grupo_amigos") },
    { v: "corporativo", l: t("profile_viaja_corporativo") },
  ];
}
function getHospedagem(t) {
  return [
    { v: "hotel_luxo", l: t("profile_hospedagem_hotel_luxo") },
    { v: "villa_privada", l: t("profile_hospedagem_villa_privada") },
    { v: "pousada", l: t("profile_hospedagem_pousada") },
    { v: "resort", l: t("profile_hospedagem_resort") },
    { v: "airbnb", l: t("profile_hospedagem_airbnb") },
  ];
}

export default function ClientProfile() {
  const { t } = useLanguage();
  const { isClientMode, effectiveClientId } = useEffectiveRole();
  const VIAJA_COM = getViajaCom(t);
  const HOSPEDAGEM = getHospedagem(t);
  const [user, setUser] = useState(null);
  const [clientNome, setClientNome] = useState("");
  const [memory, setMemory] = useState(null);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      // Nome exibido = nome do registro Client vinculado ao login (o mesmo
      // que Meu Grupo e Meu Contrato mostram), não o full_name do User —
      // que pode ser de outra conta (ex.: "Antonio"). No modo "ver como
      // cliente", usa o cliente efetivo da visualização.
      const clientId = isClientMode && effectiveClientId ? effectiveClientId : u?.client_id;
      if (clientId) {
        const clients = await base44.entities.Client.filter({ id: clientId });
        setClientNome(clients?.[0]?.nome || "");
      }
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
          <Crown className="w-3 h-3" /> {t("profile_badge")}
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {clientNome || user?.full_name || t("profile_fallback_name")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("profile_subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wine className="w-4 h-4 text-primary" /> {t("profile_section_consumo")}
          </h2>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("profile_field_bebidas")}</label>
            <Input value={form.preferencias_bebida || ""} onChange={(e) => set("preferencias_bebida", e.target.value)} placeholder={t("profile_placeholder_bebidas")} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("profile_field_restricoes")}</label>
            <Input value={form.restricoes_alimentares || ""} onChange={(e) => set("restricoes_alimentares", e.target.value)} placeholder={t("profile_placeholder_restricoes")} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" /> {t("profile_section_viagem")}
          </h2>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("profile_field_viaja_com")}</label>
            <Select value={form.viaja_com || ""} onValueChange={(v) => set("viaja_com", v)}>
              <SelectTrigger><SelectValue placeholder={t("profile_select_placeholder")} /></SelectTrigger>
              <SelectContent>
                {VIAJA_COM.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("profile_field_hospedagem")}</label>
            <Select value={form.tipo_hospedagem || ""} onValueChange={(v) => set("tipo_hospedagem", v)}>
              <SelectTrigger><SelectValue placeholder={t("profile_select_placeholder")} /></SelectTrigger>
              <SelectContent>
                {HOSPEDAGEM.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("profile_field_destinos")}</label>
            <Input value={form.destinos_favoritos || ""} onChange={(e) => set("destinos_favoritos", e.target.value)} placeholder={t("profile_placeholder_destinos")} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("profile_field_estilo")}</label>
            <Input value={form.estilos || ""} onChange={(e) => set("estilos", e.target.value)} placeholder={t("profile_placeholder_estilo")} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> {t("profile_section_concierge")}
          </h2>
          <Textarea
            value={form.observacoes || ""}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder={t("profile_placeholder_observacoes")}
            className="min-h-[80px] resize-none"
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Sparkles className="w-4 h-4" />}
          {mutation.isPending ? t("profile_saving") : saved ? t("profile_saved") : t("profile_save")}
        </Button>
      </form>
    </div>
  );
}