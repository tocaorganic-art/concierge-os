import React from "react";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  lead: { label: "Lead", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  proposta: { label: "Proposta", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  confirmado: { label: "Confirmado", className: "bg-green-500/15 text-green-400 border-green-500/20" },
  concluido: { label: "Concluído", className: "bg-primary/15 text-primary border-primary/20" },
  cancelado: { label: "Cancelado", className: "bg-red-500/15 text-red-400 border-red-500/20" },
  pendente: { label: "Pendente", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  recebido: { label: "Recebido", className: "bg-green-500/15 text-green-400 border-green-500/20" },
  atrasado: { label: "Atrasado", className: "bg-red-500/15 text-red-400 border-red-500/20" },
  familia: { label: "Família", className: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  casal: { label: "Casal", className: "bg-pink-500/15 text-pink-400 border-pink-500/20" },
  grupo: { label: "Grupo", className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  vip: { label: "VIP", className: "bg-primary/15 text-primary border-primary/20" },
  corporativo: { label: "Corporativo", className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
  baixa: { label: "Baixa", className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
  media: { label: "Média", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  alta: { label: "Alta", className: "bg-red-500/15 text-red-400 border-red-500/20" },
  chamada: { label: "Chamada", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  visita: { label: "Visita", className: "bg-green-500/15 text-green-400 border-green-500/20" },
  operacao: { label: "Operação", className: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  imovel: { label: "Imóvel", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  equipe: { label: "Equipe/Pessoal", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  transporte: { label: "Transporte", className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  outros: { label: "Outros", className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`${config.className} font-mono text-[10px] uppercase tracking-wider border`}>
      {config.label}
    </Badge>
  );
}