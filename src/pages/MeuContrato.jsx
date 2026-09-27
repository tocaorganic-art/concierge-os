import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import { agruparBillingsCliente } from "@/lib/finance";
import { FileText, Loader2 } from "lucide-react";

// Meu Contrato — composição do preço cheio (itens_contrato, dado público do
// próprio contrato) + as parcelas de "Seu Contrato" (nunca a alocação
// interna de custo/margem por trás delas, essa é admin-only).
export default function MeuContrato() {
  const { effectiveClientId } = useEffectiveRole();

  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ["my_proposals", effectiveClientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: effectiveClientId }, "-created_date", 5),
    enabled: Boolean(effectiveClientId),
  });
  const proposta = proposals?.[0];

  const { data: billings = [], isLoading: loadingBillings } = useQuery({
    queryKey: ["my_billing", effectiveClientId],
    queryFn: () => base44.entities.Billing.filter({ client_id: effectiveClientId }, "numero_parcela", 50),
    enabled: Boolean(effectiveClientId),
  });

  if (loadingProposals || loadingBillings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { contrato } = agruparBillingsCliente(billings);
  const itens = proposta?.itens_contrato || [];
  const total = itens.reduce((sum, i) => sum + (i.incluido ? 0 : i.valor || 0), 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h1 className="font-heading text-2xl font-bold text-foreground">Meu Contrato</h1>
      </div>

      {itens.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="space-y-2 mb-3">
            {itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{item.nome}</span>
                <span className={item.incluido ? "text-muted-foreground" : "font-mono text-foreground"}>
                  {item.incluido ? "Incluído" : `R$ ${(item.valor || 0).toLocaleString("pt-BR")}`}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-display font-bold text-lg text-primary">R$ {total.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      )}

      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Parcelas</p>
      <div className="space-y-2">
        {contrato.map((b) => (
          <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">
                {b.numero_parcela && b.total_parcelas ? `Parcela ${b.numero_parcela}/${b.total_parcelas}` : b.descricao}
              </p>
              <p className="text-[11px] text-muted-foreground">Venc. {b.data_vencimento ? new Date(b.data_vencimento).toLocaleDateString("pt-BR") : "—"}</p>
            </div>
            <span className="font-display font-semibold text-primary">R$ {(b.valor || 0).toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
