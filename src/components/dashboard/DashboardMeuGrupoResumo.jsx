import React from "react";
import { Link } from "react-router-dom";
import { Users, AlertTriangle } from "lucide-react";

const CAPACIDADE_PERNOITE = 15;

// "Meu grupo" — mesmo estilo de cartão de Clientes recentes do admin, com
// o resumo de pendências (nunca o documento em si, só a contagem via
// Hospede.documento_preenchido).
export default function DashboardMeuGrupoResumo({ hospedes }) {
  const excedente = Math.max(0, hospedes.length - CAPACIDADE_PERNOITE);
  const semVoo = hospedes.filter((h) => !h.voo_chegada && !h.voo_saida).length;
  const semDocumento = hospedes.filter((h) => !h.documento_preenchido).length;

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Meu grupo
        </h3>
        <Link to="/meu-grupo" className="text-xs text-primary hover:text-primary/80 font-mono uppercase tracking-wider">
          Completar dados
        </Link>
      </div>
      <p className="text-sm text-foreground mb-2">
        {hospedes.length} cadastrados · máx. {CAPACIDADE_PERNOITE} pernoitando
      </p>
      {excedente > 0 && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200">{excedente} pessoa(s) além da capacidade da casa.</p>
        </div>
      )}
      {(semVoo > 0 || semDocumento > 0) && (
        <p className="text-[11px] text-muted-foreground">
          Pendências: {semVoo > 0 ? `${semVoo} sem voo` : ""}{semVoo > 0 && semDocumento > 0 ? " · " : ""}{semDocumento > 0 ? `${semDocumento} sem documento` : ""}
        </p>
      )}
    </div>
  );
}
