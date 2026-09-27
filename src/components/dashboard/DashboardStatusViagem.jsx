import React from "react";
import { Check } from "lucide-react";

const ETAPAS = ["Proposta", "Confirmado", "50% pago", "Check-in", "Concluído"];

function etapaAtualIndex({ proposta, pctPago }) {
  if (!proposta) return 0;
  if (proposta.status === "concluido") return 4;
  const hoje = new Date();
  const chegada = proposta.data_chegada ? new Date(proposta.data_chegada) : null;
  if (chegada && hoje >= chegada) return 3;
  if (pctPago >= 50) return 2;
  if (proposta.status === "confirmado") return 1;
  return 0;
}

// "Status da viagem" — mesmo estilo de cartão do Pipeline do admin, só que
// em etapas lineares de uma única viagem em vez de colunas por cliente.
export default function DashboardStatusViagem({ proposta, pctPago }) {
  const atual = etapaAtualIndex({ proposta, pctPago });
  const diasParaChegada = proposta?.data_chegada
    ? Math.ceil((new Date(proposta.data_chegada) - new Date()) / 86400000)
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">Status da viagem</h3>
        {diasParaChegada !== null && diasParaChegada >= 0 && (
          <span className="text-xs font-mono text-primary">Faltam {diasParaChegada} dia{diasParaChegada !== 1 ? "s" : ""}</span>
        )}
      </div>
      <div className="flex items-center">
        {ETAPAS.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                i < atual ? "bg-primary border-primary" : i === atual ? "border-primary bg-primary/10" : "border-border bg-secondary"
              }`}>
                {i < atual ? <Check className="w-3.5 h-3.5 text-primary-foreground" /> : <span className={`text-[10px] font-mono ${i === atual ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>}
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-wider text-center max-w-[60px] ${i === atual ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < ETAPAS.length - 1 && <div className={`flex-1 h-0.5 mb-4 ${i < atual ? "bg-primary" : "bg-border"}`} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
