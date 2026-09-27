import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, AlertTriangle, CheckCircle2 } from "lucide-react";

const CAPACIDADE_PERNOITE = 15;

// Uma linha de hóspede editável — o cliente completa voo/horário/aerolínea e o
// documento, mas NUNCA lê de volta o documento (RLS de campo em Hospede.documento
// bloqueia leitura para quem não é admin — o campo aqui é sempre um input vazio,
// nunca pré-preenchido, mesmo que já tenha sido salvo antes).
function HospedeRow({ hospede, onSaved }) {
  const [form, setForm] = useState({
    voo_chegada: hospede.voo_chegada || "",
    horario_chegada: hospede.horario_chegada || "",
    aerolinea_chegada: hospede.aerolinea_chegada || "",
    voo_saida: hospede.voo_saida || "",
    horario_saida: hospede.horario_saida || "",
    aerolinea_saida: hospede.aerolinea_saida || "",
    documento: "",
    pernoita_em: hospede.pernoita_em || "casa",
  });
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Hospede.update(hospede.id, data),
    onSuccess: () => {
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const payload = { ...form };
    if (!payload.documento) {
      delete payload.documento; // não sobrescreve com vazio sem querer
    } else {
      payload.documento_preenchido = true; // sinalizador legível, nunca o valor
    }
    mutation.mutate(payload);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <p className="font-medium text-foreground">{hospede.nome} {hospede.sobrenome}</p>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Voo de chegada" value={form.voo_chegada} onChange={(e) => setForm((f) => ({ ...f, voo_chegada: e.target.value }))} className="bg-secondary border-border text-sm" />
        <Input placeholder="Horário chegada" value={form.horario_chegada} onChange={(e) => setForm((f) => ({ ...f, horario_chegada: e.target.value }))} className="bg-secondary border-border text-sm" />
        <Input placeholder="Companhia aérea (chegada)" value={form.aerolinea_chegada} onChange={(e) => setForm((f) => ({ ...f, aerolinea_chegada: e.target.value }))} className="bg-secondary border-border text-sm col-span-2" />
        <Input placeholder="Voo de saída" value={form.voo_saida} onChange={(e) => setForm((f) => ({ ...f, voo_saida: e.target.value }))} className="bg-secondary border-border text-sm" />
        <Input placeholder="Horário saída" value={form.horario_saida} onChange={(e) => setForm((f) => ({ ...f, horario_saida: e.target.value }))} className="bg-secondary border-border text-sm" />
        <Input placeholder="Companhia aérea (saída)" value={form.aerolinea_saida} onChange={(e) => setForm((f) => ({ ...f, aerolinea_saida: e.target.value }))} className="bg-secondary border-border text-sm col-span-2" />
        <Input type="password" placeholder="Documento (DNI/CPF/passaporte)" value={form.documento} onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))} className="bg-secondary border-border text-sm col-span-2" />
        <div className="col-span-2">
          <Select value={form.pernoita_em} onValueChange={(v) => setForm((f) => ({ ...f, pernoita_em: v }))}>
            <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="casa">Dorme na casa</SelectItem>
              <SelectItem value="apartamento">Dorme no apartamento adicional</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button size="sm" onClick={handleSave} disabled={mutation.isPending} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
        {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
        {saved ? "Salvo!" : "Salvar"}
      </Button>
    </div>
  );
}

export default function MeuGrupo() {
  const { effectiveClientId } = useEffectiveRole();
  const queryClient = useQueryClient();

  const { data: proposals = [] } = useQuery({
    queryKey: ["my_proposals", effectiveClientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: effectiveClientId }, "-created_date", 5),
    enabled: Boolean(effectiveClientId),
  });
  const proposalId = proposals?.[0]?.id;

  const { data: hospedes = [], isLoading } = useQuery({
    queryKey: ["my_hospedes", proposalId],
    queryFn: () => base44.entities.Hospede.filter({ proposal_id: proposalId }, "nome", 50),
    enabled: Boolean(proposalId),
  });

  const excedente = Math.max(0, hospedes.length - CAPACIDADE_PERNOITE);
  const semVoo = hospedes.filter((h) => !h.voo_chegada && !h.voo_saida).length;
  const semDocumento = hospedes.filter((h) => !h.documento_preenchido).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="font-heading text-2xl font-bold text-foreground">Meu Grupo</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {hospedes.length} cadastrados · máx. {CAPACIDADE_PERNOITE} pernoitando
        {(semVoo > 0 || semDocumento > 0) && (
          <span className="text-amber-400"> · {semVoo > 0 ? `${semVoo} sem voo` : ""}{semVoo > 0 && semDocumento > 0 ? ", " : ""}{semDocumento > 0 ? `${semDocumento} sem documento` : ""}</span>
        )}
      </p>

      {excedente > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200">
            O grupo tem {excedente} pessoa(s) além do limite de {CAPACIDADE_PERNOITE} pernoitando na casa. Indique abaixo quem fica no apartamento adicional.
          </p>
        </div>
      )}

      {hospedes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhum hóspede cadastrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {hospedes.map((h) => (
            <HospedeRow key={h.id} hospede={h} onSaved={() => queryClient.invalidateQueries({ queryKey: ["my_hospedes", proposalId] })} />
          ))}
        </div>
      )}
    </div>
  );
}
