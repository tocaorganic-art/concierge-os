import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import RequestModal from "@/components/concierge/RequestModal";
import { COMPANY_INFO } from "@/lib/paymentInfo";
import { saldoDevedor } from "@/lib/finance";
import { Crown, MapPin, CalendarDays, ArrowRight } from "lucide-react";

const STATUS_PROPOSTA = {
  lead: { label: "Em análise", className: "bg-secondary text-muted-foreground border-border" },
  proposta: { label: "Proposta enviada", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  confirmado: { label: "Confirmado", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  concluido: { label: "Concluído", className: "bg-primary/10 text-primary border-primary/20" },
  cancelado: { label: "Cancelado", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

const TIPOS = [
  {
    id: "experiencia",
    emoji: "🏝️",
    label: "Experiência",
    sub: "Roteiros, passeios e aventuras",
    color: "from-blue-600/20 to-blue-500/5 border-blue-500/20 hover:border-blue-400/50",
    glow: "hover:shadow-blue-500/10",
  },
  {
    id: "reserva",
    emoji: "🍽️",
    label: "Reservar",
    sub: "Restaurantes, hotéis, transfers",
    color: "from-amber-600/20 to-amber-500/5 border-amber-500/20 hover:border-amber-400/50",
    glow: "hover:shadow-amber-500/10",
  },
  {
    id: "exclusivo",
    emoji: "🚁",
    label: "Exclusivo",
    sub: "Yacht, helicóptero, chef privado",
    color: "from-purple-600/20 to-purple-500/5 border-purple-500/20 hover:border-purple-400/50",
    glow: "hover:shadow-purple-500/10",
  },
  {
    id: "ajuda",
    emoji: "🆘",
    label: "Preciso de ajuda",
    sub: "Suporte emergencial agora",
    color: "from-red-600/20 to-red-500/5 border-red-500/20 hover:border-red-400/50",
    glow: "hover:shadow-red-500/10",
  },
];

// Home do Portal do Cliente — enxuta de propósito: só saudação, resumo mínimo
// da reserva atual e os 4 atalhos de ação. Pagamentos/comprovantes vivem em
// /portal/financeiro e o histórico de pedidos em /portal/pedidos (ver
// ClientLayout.jsx para a navegação por abas).
export default function ClientPortal() {
  const [selectedTipo, setSelectedTipo] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useUserProfile();
  const clientId = user?.client_id;

  const { data: minhasPropostas = [] } = useQuery({
    queryKey: ["my_proposals", clientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: clientId }, "-created_date", 10),
    enabled: Boolean(clientId),
  });

  const { data: meusPagamentos = [] } = useQuery({
    queryKey: ["my_billing", clientId],
    queryFn: () => base44.entities.Billing.filter({ client_id: clientId }, "data_vencimento", 50),
    enabled: Boolean(clientId),
  });

  const { data: meusRecebimentos = [] } = useQuery({
    queryKey: ["my_recebimentos", clientId],
    queryFn: () => base44.entities.Recebimento.filter({ client_id: clientId }, "-data_recebimento", 200),
    enabled: Boolean(clientId),
  });

  const proposta = minhasPropostas?.[0] || null;
  // Mesma fonte que /portal/financeiro (regra R8: nenhum saldo calculado
  // duas vezes) — saldo por cobranca via saldoDevedor(), nunca somando
  // Billing.valor bruto (isso contava ate cobrancas canceladas).
  const saldoPendente = meusPagamentos
    .filter((b) => b.status !== "cancelado")
    .reduce((sum, b) => sum + Math.max(0, saldoDevedor(b, meusRecebimentos)), 0);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_requests"] });
      setSelectedTipo(null);
    },
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pt-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono px-3 py-1 rounded-full mb-4">
            <Crown className="w-3 h-3" /> Toca OS
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-1">
            {greeting()}{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">Como posso ajudar você hoje?</p>
        </div>

        {/* Minha Reserva — resumo curto, sem detalhamento de pagamentos aqui */}
        {clientId && proposta && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary" /> {proposta.destino || "Sua experiência"}
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${STATUS_PROPOSTA[proposta.status]?.className || "bg-secondary text-muted-foreground border-border"}`}>
                {STATUS_PROPOSTA[proposta.status]?.label || proposta.status}
              </span>
            </div>
            {(proposta.data_chegada || proposta.data_saida) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <CalendarDays className="w-3 h-3" />
                {formatDate(proposta.data_chegada)} — {formatDate(proposta.data_saida)}
                {proposta.num_pax ? ` · ${proposta.num_pax} pessoas` : ""}
              </div>
            )}
            {saldoPendente > 0 && (
              <Link
                to="/portal/financeiro"
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors"
              >
                <span className="text-xs text-amber-400 font-medium">
                  Saldo pendente: R$ {saldoPendente.toLocaleString("pt-BR")}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                  Ver financeiro <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            )}
          </div>
        )}

        {/* 4 Action Tiles */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {TIPOS.map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => setSelectedTipo(tipo)}
              className={`relative bg-gradient-to-b ${tipo.color} border rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${tipo.glow} group`}
            >
              <span className="text-3xl block mb-3">{tipo.emoji}</span>
              <p className="font-semibold text-foreground text-sm">{tipo.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{tipo.sub}</p>
            </button>
          ))}
        </div>

        {/* Rodapé — identificação da empresa */}
        <p className="text-center text-[10px] text-muted-foreground/70 pb-6">
          {COMPANY_INFO.nomeEmpresarial} · CNPJ {COMPANY_INFO.cnpjFormatado}
        </p>
      </div>

      {/* Request Modal */}
      {selectedTipo && (
        <RequestModal
          tipo={selectedTipo}
          user={user}
          onClose={() => setSelectedTipo(null)}
          onSubmit={(data) => createMutation.mutate(data)}
          isSubmitting={createMutation.isPending}
        />
      )}
    </div>
  );
}
