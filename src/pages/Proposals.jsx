import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, MapPin, Calendar, Sparkles, MessageCircle } from "lucide-react";
import ProposalPdfButton from "@/components/proposals/ProposalPdfButton";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ProposalFormDialog from "@/components/proposals/ProposalFormDialog";
import AIProposalModal from "@/components/proposals/AIProposalModal";
import WhatsAppModal from "@/components/whatsapp/WhatsAppModal";

const AiBadge = () => (
  <span className="inline-flex items-center gap-1 bg-primary/15 text-primary text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-primary/20">✦ IA</span>
);

export default function Proposals() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editProposal, setEditProposal] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [whatsappProposal, setWhatsappProposal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list("-created_date", 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  const filtered = proposals.filter((p) => {
    const matchSearch =
      !search ||
      p.client_nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.destino?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleAIGenerated = (data) => {
    setEditProposal(data);
    setShowForm(true);
  };

  const getWhatsAppMessage = (p) => {
    const lines = [
      `Olá, ${p.client_nome}! 😊`,
      ``,
      `Segue o resumo da sua proposta:`,
      `📍 *${p.destino}*`,
      p.data_chegada ? `📅 ${new Date(p.data_chegada).toLocaleDateString("pt-BR")}${p.data_saida ? ` a ${new Date(p.data_saida).toLocaleDateString("pt-BR")}` : ""}` : "",
      p.num_pax ? `👥 ${p.num_pax} pessoa${p.num_pax > 1 ? "s" : ""}` : "",
      p.valor ? `💰 Investimento: R$ ${p.valor.toLocaleString("pt-BR")}` : "",
      ``,
      `Qualquer dúvida, estou à disposição! ✨`,
    ].filter(Boolean);
    return lines.join("\n");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const clientPhone = (proposal) =>
    clients.find((c) => c.id === proposal?.client_id)?.telefone || "";

  return (
    <div>
      <PageHeader
        title={t("nav_proposals")}
        subtitle={`${proposals.length} ${t("proposals_registered")}`}
        action={
          <div className="hidden md:flex items-center gap-2">
            <Button onClick={() => setShowAI(true)} variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
              <Sparkles className="w-4 h-4" /> Gerar com IA <AiBadge />
            </Button>
            <Button onClick={() => { setEditProposal(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" /> {t("btn_new_proposal")}
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("placeholder_search_proposal")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 md:w-40 bg-secondary border-border"><SelectValue placeholder={t("field_status")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter_all")}</SelectItem>
            <SelectItem value="lead">{t("status_lead")}</SelectItem>
            <SelectItem value="proposta">{t("status_proposta")}</SelectItem>
            <SelectItem value="confirmado">{t("status_confirmado")}</SelectItem>
            <SelectItem value="concluido">{t("status_concluido")}</SelectItem>
            <SelectItem value="cancelado">{t("status_cancelado")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title={t("no_proposals")} description={t("create_first_proposal")} />
      ) : (
        <>
          <div className="grid gap-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 md:p-5 gold-border-hover">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div
                    className="flex items-center gap-2 flex-wrap cursor-pointer flex-1"
                    onClick={() => { setEditProposal(p); setShowForm(true); }}
                  >
                    <p className="font-medium text-foreground">{p.client_nome}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.valor > 0 && (
                      <p className="font-display text-lg font-bold text-primary">
                        {t("currency_symbol")} {p.valor.toLocaleString(t("locale_date"))}
                      </p>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setWhatsappProposal(p); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                      title="Enviar via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <ProposalPdfButton proposal={p} />
                  </div>
                </div>
                <div
                  className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground cursor-pointer"
                  onClick={() => { setEditProposal(p); setShowForm(true); }}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {p.destino}
                  </span>
                  {p.data_chegada && (
                    <span className="flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(p.data_chegada).toLocaleDateString(t("locale_date"))}
                      {p.data_saida && ` — ${new Date(p.data_saida).toLocaleDateString(t("locale_date"))}`}
                    </span>
                  )}
                  {p.num_pax > 0 && <span className="font-mono text-xs">{p.num_pax} pax</span>}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setEditProposal(null); setShowForm(true); }}
            className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
            aria-label="Nova Proposta"
          >
            <Plus className="w-6 h-6" />
          </button>
        </>
      )}

      <ProposalFormDialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) queryClient.invalidateQueries({ queryKey: ["proposals"] }); }} proposal={editProposal} />
      <AIProposalModal open={showAI} onOpenChange={setShowAI} onGenerated={handleAIGenerated} />

      {whatsappProposal && (
        <WhatsAppModal
          open={!!whatsappProposal}
          onOpenChange={(v) => { if (!v) setWhatsappProposal(null); }}
          client_nome={whatsappProposal.client_nome}
          telefone={clientPhone(whatsappProposal)}
          context={getWhatsAppMessage(whatsappProposal)}
        />
      )}
    </div>
  );
}