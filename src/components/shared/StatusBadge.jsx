import React from "react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";

function getStatusConfig(t) {
  return {
    lead: { label: t("status_lead"), className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    proposta: { label: t("status_proposta"), className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    confirmado: { label: t("status_confirmado"), className: "bg-green-500/15 text-green-400 border-green-500/20" },
    concluido: { label: t("status_concluido"), className: "bg-primary/15 text-primary border-primary/20" },
    cancelado: { label: t("status_cancelado"), className: "bg-red-500/15 text-red-400 border-red-500/20" },
    pendente: { label: t("status_pendente"), className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    aguardando_confirmacao: { label: t("billing_status_aguardando_confirmacao"), className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    parcialmente_recebido: { label: t("billing_status_parcial"), className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    recebido: { label: t("status_recebido"), className: "bg-green-500/15 text-green-400 border-green-500/20" },
    atrasado: { label: t("status_atrasado"), className: "bg-red-500/15 text-red-400 border-red-500/20" },
    familia: { label: t("type_family"), className: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
    casal: { label: t("type_couple"), className: "bg-pink-500/15 text-pink-400 border-pink-500/20" },
    grupo: { label: t("type_group"), className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
    vip: { label: t("type_vip"), className: "bg-primary/15 text-primary border-primary/20" },
    corporativo: { label: t("type_corporate"), className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
    baixa: { label: t("priority_low"), className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
    media: { label: t("priority_medium"), className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    alta: { label: t("priority_high"), className: "bg-red-500/15 text-red-400 border-red-500/20" },
    chamada: { label: t("task_call"), className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    visita: { label: t("task_visit"), className: "bg-green-500/15 text-green-400 border-green-500/20" },
    operacao: { label: t("task_operation"), className: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
    imovel: { label: t("cat_imovel"), className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    equipe: { label: t("cat_equipe_pessoal"), className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    transporte: { label: t("cat_transporte"), className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
    outros: { label: t("cat_outros"), className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
  };
}

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const statusConfig = getStatusConfig(t);
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`${config.className} font-mono text-[10px] uppercase tracking-wider border`}>
      {config.label}
    </Badge>
  );
}