import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import RequestModal from "@/components/concierge/RequestModal";
import RequestHistory from "@/components/concierge/RequestHistory";
import PixPaymentCard from "@/components/billing/PixPaymentCard";
import { COMPANY_INFO } from "@/lib/paymentInfo";
import { Loader2, Crown, MapPin, CalendarDays, Receipt, CheckCircle2, Clock, AlertTriangle, Paperclip, Camera } from "lucide-react";

const STATUS_PROPOSTA = {
  lead: { label: "Em análise", className: "bg-secondary text-muted-foreground border-border" },
  proposta: { label: "Proposta enviada", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  confirmado: { label: "Confirmado", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  concluido: { label: "Concluído", className: "bg-primary/10 text-primary border-primary/20" },
  cancelado: { label: "Cancelado", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const STATUS_PAGAMENTO = {
  pendente: { label: "Pendente", icon: Clock, className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  recebido: { label: "Pago", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  atrasado: { label: "Atrasado", icon: AlertTriangle, className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

// Permite ao cliente anexar seu próprio comprovante de pagamento a uma cobrança
// pendente/atrasada — só grava o campo comprovante_url (RLS de campo em
// base44/entities/Billing.jsonc), nunca altera valor, status ou qualquer outro
// dado da cobrança.
function AnexarComprovante({ billing, onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Billing.update(billing.id, { comprovante_url: file_url });
      onUploaded();
    } catch {
      setError("Não consegui enviar. Tente novamente.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mt-0.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-60"
      >
        {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />}
        {uploading ? "Enviando..." : "Anexar comprovante de pagamento"}
      </button>
      {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
    </div>
  );
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

export default function ClientPortal() {
  const [selectedTipo, setSelectedTipo] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useUserProfile();
  const clientId = user?.client_id;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my_requests"],
    queryFn: () => base44.entities.ServiceRequest.list("-created_date", 20),
  });

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

  const proposta = minhasPropostas?.[0] || null;
  const totalCobrado = meusPagamentos.reduce((sum, b) => sum + (b.valor || 0), 0);
  const totalPago = meusPagamentos.filter((b) => b.status === "recebido").reduce((sum, b) => sum + (b.valor || 0), 0);
  const saldoPendente = totalCobrado - totalPago;
  const pctPago = totalCobrado > 0 ? Math.round((totalPago / totalCobrado) * 100) : 0;

  // Mostra a forma de pagamento apenas quando há cobrança de "Contas a Pagar" pendente/atrasada
  const temContasAPagarPendente = meusPagamentos.some(
    (b) => (b.categoria || "").trim().toLowerCase() === "contas a pagar" && b.status !== "recebido"
  );

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
      <div className="max-w-lg mx-auto px-4 pt-10 pb-20">
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

        {/* Minha Reserva */}
        {clientId && (proposta || meusPagamentos.length > 0) && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-8">
            {proposta && (
              <div className="mb-4 pb-4 border-b border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {proposta.destino || "Sua experiência"}
                  </div>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${STATUS_PROPOSTA[proposta.status]?.className || "bg-secondary text-muted-foreground border-border"}`}>
                    {STATUS_PROPOSTA[proposta.status]?.label || proposta.status}
                  </span>
                </div>
                {(proposta.data_chegada || proposta.data_saida) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="w-3 h-3" />
                    {formatDate(proposta.data_chegada)} — {formatDate(proposta.data_saida)}
                    {proposta.num_pax ? ` · ${proposta.num_pax} pessoas` : ""}
                  </div>
                )}
              </div>
            )}

            {meusPagamentos.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    <Receipt className="w-3.5 h-3.5" /> Pagamentos
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    R$ {totalPago.toLocaleString("pt-BR")} de R$ {totalCobrado.toLocaleString("pt-BR")} pago
                  </span>
                </div>

                {/* Barra de progresso do total pago */}
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(pctPago, 100)}%` }}
                  />
                </div>

                {/* Saldo pendente em destaque */}
                {saldoPendente > 0 && (
                  <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-xs text-amber-400 font-medium">Saldo pendente</span>
                    <span className="font-display font-bold text-amber-400">R$ {saldoPendente.toLocaleString("pt-BR")}</span>
                  </div>
                )}

                <div className="space-y-2">
                  {meusPagamentos.map((b) => {
                    const meta = STATUS_PAGAMENTO[b.status] || STATUS_PAGAMENTO.pendente;
                    const StatusIcon = meta.icon;
                    const podeAnexar = b.status !== "recebido" && !b.comprovante_url;
                    return (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="text-foreground truncate max-w-[160px]">{b.descricao || "Parcela"}</p>
                          <p className="text-[11px] text-muted-foreground">Venc. {formatDate(b.data_vencimento)}</p>
                          {b.comprovante_url && (
                            <a href={b.comprovante_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5">
                              <Paperclip className="w-2.5 h-2.5" /> Comprovante
                            </a>
                          )}
                          {podeAnexar && (
                            <AnexarComprovante
                              billing={b}
                              onUploaded={() => queryClient.invalidateQueries({ queryKey: ["my_billing", clientId] })}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-display font-semibold text-primary">R$ {(b.valor || 0).toLocaleString("pt-BR")}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${meta.className}`}>
                            <StatusIcon className="w-2.5 h-2.5" /> {meta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Forma de pagamento — Contas a Pagar */}
        {clientId && temContasAPagarPendente && <PixPaymentCard />}

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

        {/* History */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : requests.length > 0 ? (
          <RequestHistory requests={requests} />
        ) : null}

        {/* Rodapé — identificação da empresa */}
        <p className="text-center text-[10px] text-muted-foreground/70 mt-10">
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