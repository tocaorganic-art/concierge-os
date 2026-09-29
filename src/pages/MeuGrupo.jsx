import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, AlertTriangle, CheckCircle2, Plane, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const CAPACIDADE_PERNOITE = 15;

// Uma linha de hóspede editável — o cliente completa voo/horário/aerolínea e o
// documento, mas NUNCA lê de volta o documento (RLS de campo em Hospede.documento
// bloqueia leitura para quem não é admin — o campo aqui é sempre um input vazio,
// nunca pré-preenchido, mesmo que já tenha sido salvo antes).
function HospedeRow({ hospede, onSaved }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    voo_chegada: hospede.voo_chegada || "",
    horario_chegada: hospede.horario_chegada || "",
    data_chegada: hospede.data_chegada || "",
    aerolinea_chegada: hospede.aerolinea_chegada || "",
    voo_saida: hospede.voo_saida || "",
    horario_saida: hospede.horario_saida || "",
    data_saida: hospede.data_saida || "",
    aerolinea_saida: hospede.aerolinea_saida || "",
    documento: "",
    pernoita_em: hospede.pernoita_em || "casa",
  });
  const [saved, setSaved] = useState(false);
  const [lendoVoo, setLendoVoo] = useState(false);
  const [lidoPorIA, setLidoPorIA] = useState(false);
  const [erroLeitura, setErroLeitura] = useState("");

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

  // Lê um comprovante de voo (bilhete, e-ticket, print da companhia) e
  // PREENCHE os campos abaixo pra revisão — nunca salva sozinho. Quem
  // confirma (ou corrige) e clica em Salvar é sempre a pessoa, igual ao
  // padrão de AI-fill já usado em BillingFormDialog.
  const handleComprovanteVoo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLendoVoo(true);
    setErroLeitura("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            voo_chegada: { type: "string", description: "Número do voo de chegada/ida (ex: LA3456)" },
            horario_chegada: { type: "string", description: "Horário de chegada no formato HH:MM" },
            data_chegada: { type: "string", format: "date", description: "Data de chegada (YYYY-MM-DD)" },
            aerolinea_chegada: { type: "string", description: "Companhia aérea do voo de chegada" },
            voo_saida: { type: "string", description: "Número do voo de saída/volta, se houver no mesmo documento" },
            horario_saida: { type: "string", description: "Horário de saída no formato HH:MM" },
            data_saida: { type: "string", format: "date", description: "Data de saída (YYYY-MM-DD)" },
            aerolinea_saida: { type: "string", description: "Companhia aérea do voo de saída" },
          },
        },
      });
      const data = extracted?.output || extracted || {};
      setForm((f) => ({
        ...f,
        voo_chegada: data.voo_chegada || f.voo_chegada,
        horario_chegada: data.horario_chegada || f.horario_chegada,
        data_chegada: data.data_chegada || f.data_chegada,
        aerolinea_chegada: data.aerolinea_chegada || f.aerolinea_chegada,
        voo_saida: data.voo_saida || f.voo_saida,
        horario_saida: data.horario_saida || f.horario_saida,
        data_saida: data.data_saida || f.data_saida,
        aerolinea_saida: data.aerolinea_saida || f.aerolinea_saida,
      }));
      setLidoPorIA(true);
    } catch {
      setErroLeitura(t("meugrupo_read_error"));
    } finally {
      setLendoVoo(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-foreground">{hospede.nome} {hospede.sobrenome}</p>
        <label className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer flex-shrink-0">
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleComprovanteVoo} disabled={lendoVoo} />
          {lendoVoo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plane className="w-3 h-3" />}
          {lendoVoo ? t("common_loading_dots") : t("meugrupo_attach_flight_proof")}
        </label>
      </div>
      {erroLeitura && <p className="text-[11px] text-red-400">{erroLeitura}</p>}
      {lidoPorIA && (
        <p className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
          <Sparkles className="w-2.5 h-2.5" /> {t("meugrupo_ai_read_hint")}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder={t("meugrupo_field_voo_chegada")} value={form.voo_chegada} onChange={(e) => setForm((f) => ({ ...f, voo_chegada: e.target.value }))} className="bg-secondary border-border text-sm" />
        <Input placeholder={t("meugrupo_field_horario_chegada")} value={form.horario_chegada} onChange={(e) => setForm((f) => ({ ...f, horario_chegada: e.target.value }))} className="bg-secondary border-border text-sm" />
        <Input type="date" placeholder={t("meugrupo_field_data_chegada")} value={form.data_chegada} onChange={(e) => setForm((f) => ({ ...f, data_chegada: e.target.value }))} className="bg-secondary border-border text-sm col-span-2" />
        <Input placeholder={t("meugrupo_field_companhia_chegada")} value={form.aerolinea_chegada} onChange={(e) => setForm((f) => ({ ...f, aerolinea_chegada: e.target.value }))} className="bg-secondary border-border text-sm col-span-2" />
        <Input placeholder={t("meugrupo_field_voo_saida")} value={form.voo_saida} onChange={(e) => setForm((f) => ({ ...f, voo_saida: e.target.value }))} className="bg-secondary border-border text-sm" />
        <Input placeholder={t("meugrupo_field_horario_saida")} value={form.horario_saida} onChange={(e) => setForm((f) => ({ ...f, horario_saida: e.target.value }))} className="bg-secondary border-border text-sm" />
        <Input type="date" placeholder={t("meugrupo_field_data_saida")} value={form.data_saida} onChange={(e) => setForm((f) => ({ ...f, data_saida: e.target.value }))} className="bg-secondary border-border text-sm col-span-2" />
        <Input placeholder={t("meugrupo_field_companhia_saida")} value={form.aerolinea_saida} onChange={(e) => setForm((f) => ({ ...f, aerolinea_saida: e.target.value }))} className="bg-secondary border-border text-sm col-span-2" />
        <Input type="password" placeholder={t("meugrupo_field_documento")} value={form.documento} onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))} className="bg-secondary border-border text-sm col-span-2" />
        <div className="col-span-2">
          <Select value={form.pernoita_em} onValueChange={(v) => setForm((f) => ({ ...f, pernoita_em: v }))}>
            <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="casa">{t("meugrupo_option_casa")}</SelectItem>
              <SelectItem value="apartamento">{t("meugrupo_option_apartamento")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button size="sm" onClick={handleSave} disabled={mutation.isPending} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
        {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
        {saved ? t("common_saved") : t("btn_save")}
      </Button>
    </div>
  );
}

export default function MeuGrupo() {
  const { t } = useLanguage();
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

  // Ordena por chegada (data + horário) pra quem organiza os traslados saber
  // quem desembarca primeiro. horario_chegada e um campo texto livre (sem
  // formato obrigatorio no schema), entao o parse e best-effort: so ordena
  // por horario quando reconhece "HH:MM" no inicio da string; quem nao tem
  // data/horario preenchido vai pro final da lista, nunca pro comeco.
  const hospedesOrdenados = React.useMemo(() => {
    const parseMinutos = (h) => {
      const m = String(h || "").trim().match(/^(\d{1,2}):(\d{2})/);
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    return [...hospedes].sort((a, b) => {
      const dataA = a.data_chegada || "9999-12-31";
      const dataB = b.data_chegada || "9999-12-31";
      if (dataA !== dataB) return dataA < dataB ? -1 : 1;
      const minA = parseMinutos(a.horario_chegada);
      const minB = parseMinutos(b.horario_chegada);
      if (minA === null && minB === null) return 0;
      if (minA === null) return 1;
      if (minB === null) return -1;
      return minA - minB;
    });
  }, [hospedes]);

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
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("meugrupo_title")}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {t("meugrupo_summary", { count: hospedes.length, max: CAPACIDADE_PERNOITE })}
        {(semVoo > 0 || semDocumento > 0) && (
          <span className="text-amber-400"> · {semVoo > 0 ? t("meugrupo_missing_flight", { count: semVoo }) : ""}{semVoo > 0 && semDocumento > 0 ? ", " : ""}{semDocumento > 0 ? t("meugrupo_missing_doc", { count: semDocumento }) : ""}</span>
        )}
      </p>

      {excedente > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200">
            {t("meugrupo_excedente_warning", { count: excedente, max: CAPACIDADE_PERNOITE })}
          </p>
        </div>
      )}

      {hospedes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">{t("meugrupo_empty")}</p>
      ) : (
        <div className="space-y-3">
          {hospedesOrdenados.map((h) => (
            <HospedeRow key={h.id} hospede={h} onSaved={() => queryClient.invalidateQueries({ queryKey: ["my_hospedes", proposalId] })} />
          ))}
        </div>
      )}
    </div>
  );
}
