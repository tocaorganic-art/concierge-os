import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import PixPaymentCard from "@/components/billing/PixPaymentCard";
import { formatDate, LinhaParcela } from "@/components/billing/ClientBillingBlocks";
import { Loader2, Receipt, Crown } from "lucide-react";
import { saldoDevedor, valorRecebido, statusDerivado } from "@/lib/finance";

// Aba Financeiro do Portal do Cliente — modelo "Open Book" (regras
// universais de contabilidade gerencial, ver docs/OPEN_BOOK_PORTAL_FINANCEIRO.md
// e o PR que introduziu Recebimento/natureza). Somente leitura, só os dados
// do próprio cliente (RLS no backend, não só no front). Nunca mostra custo
// real, margem, alocação nem identidade de fornecedor — regra explícita do
// Tony (ver PR que removeu o bloco "Custos da Operação": expunha o nome do
// fornecedor real por trás de cada cobrança, mesmo mostrando só o valor
// cobrado do cliente).
export default function ClientFinanceiro() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingProfile } = useUserProfile();
  const clientId = user?.client_id;

  const { data: meusBillings = [], isLoading: isLoadingBilling } = useQuery({
    queryKey: ["my_billing", clientId],
    queryFn: () => base44.entities.Billing.filter({ client_id: clientId }, "numero_parcela", 50),
    enabled: Boolean(clientId),
  });

  const { data: meusRecebimentos = [], isLoading: isLoadingRecebimentos } = useQuery({
    queryKey: ["my_recebimentos", clientId],
    queryFn: () => base44.entities.Recebimento.filter({ client_id: clientId }, "-data_recebimento", 200),
    enabled: Boolean(clientId),
  });

  const { data: minhasPropostas = [] } = useQuery({
    queryKey: ["my_proposals", clientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: clientId }, "-created_date", 10),
    enabled: Boolean(clientId),
  });
  const formaPagamento = minhasPropostas?.[0]?.forma_pagamento_preferida;
  const chavePixContrato = minhasPropostas?.[0]?.chave_pix_recebimento || "";

  // Bloco 1 — Honorário de concierge: só cobranças classificadas como
  // natureza="honorario". Registros ainda "a_classificar" não entram aqui
  // até a equipe confirmar a natureza (ver relatório da migração).
  const honorarios = meusBillings.filter((b) => b.natureza === "honorario");

  // Cobranças de repasse/a_classificar ainda em aberto (ex.: "Contas a
  // Pagar" — aluguel de carro, som, etc.) continuam visíveis: são dinheiro
  // que o cliente ainda precisa pagar, não podem desaparecer da tela só
  // por não serem "honorário".
  const outrasCobrancasAbertas = meusBillings.filter(
    (b) => b.natureza !== "honorario" && statusDerivado(b, meusRecebimentos) !== "recebido" && statusDerivado(b, meusRecebimentos) !== "cancelado"
  );
  const totalContrato = honorarios.reduce((sum, b) => sum + (b.valor || 0), 0);
  const totalPagoHonorario = honorarios.reduce((sum, b) => sum + valorRecebido(b, meusRecebimentos), 0);
  const saldoHonorario = honorarios.reduce((sum, b) => sum + Math.max(0, saldoDevedor(b, meusRecebimentos)), 0);
  const proximoVencimento = honorarios
    .filter((b) => statusDerivado(b, meusRecebimentos) !== "recebido" && statusDerivado(b, meusRecebimentos) !== "cancelado")
    .map((b) => b.data_vencimento)
    .filter(Boolean)
    .sort()[0];

  const temContasAPagarPendente = meusBillings.some(
    (b) => (b.categoria || "").trim().toLowerCase() === "contas a pagar" && statusDerivado(b, meusRecebimentos) !== "recebido"
  );

  const isLoading = isLoadingProfile || isLoadingBilling || isLoadingRecebimentos;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="font-heading text-xl font-bold text-foreground mb-4">Financeiro</h1>

      {/* Bloco 1 — Honorário de concierge */}
      {honorarios.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
            <Crown className="w-3.5 h-3.5 text-primary" /> Honorário de Concierge
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Total contratado</p>
              <p className="font-display text-lg font-bold text-foreground">R$ {totalContrato.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Pago</p>
              <p className="font-display text-lg font-bold text-emerald-400">R$ {totalPagoHonorario.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Saldo</p>
              <p className="font-display text-lg font-bold text-amber-400">R$ {saldoHonorario.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Próximo vencimento</p>
              <p className="font-display text-lg font-bold text-foreground">{proximoVencimento ? formatDate(proximoVencimento) : "—"}</p>
            </div>
          </div>
          <div>
            {honorarios.map((b) => (
              <LinhaParcela
                key={b.id}
                billing={b}
                recebimentos={meusRecebimentos}
                onUploaded={() => { queryClient.invalidateQueries({ queryKey: ["my_billing", clientId] }); queryClient.invalidateQueries({ queryKey: ["my_recebimentos", clientId] }); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Outras cobranças em aberto (Contas a Pagar / repasse) */}
      {outrasCobrancasAbertas.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
            <Receipt className="w-3.5 h-3.5" /> Outras Cobranças em Aberto
          </div>
          <div>
            {outrasCobrancasAbertas.map((b) => (
              <LinhaParcela
                key={b.id}
                billing={b}
                recebimentos={meusRecebimentos}
                onUploaded={() => { queryClient.invalidateQueries({ queryKey: ["my_billing", clientId] }); queryClient.invalidateQueries({ queryKey: ["my_recebimentos", clientId] }); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rodapé consolidado */}
      {honorarios.length > 0 && (
        <div className="bg-secondary/40 border border-border rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Total do Contrato</p>
            <p className="font-display font-bold text-foreground">R$ {totalContrato.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Total Pago</p>
            <p className="font-display font-bold text-emerald-400">R$ {totalPagoHonorario.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Saldo Devedor</p>
            <p className="font-display font-bold text-amber-400">R$ {saldoHonorario.toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Próximo Vencimento</p>
            <p className="font-display font-bold text-foreground">{proximoVencimento ? formatDate(proximoVencimento) : "—"}</p>
          </div>
        </div>
      )}

      {/* Como pagar */}
      {temContasAPagarPendente && <PixPaymentCard formaPagamento={formaPagamento} chavePixContrato={chavePixContrato} />}

      {honorarios.length === 0 && outrasCobrancasAbertas.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">Nenhum lançamento financeiro ainda.</p>
      )}
    </div>
  );
}
