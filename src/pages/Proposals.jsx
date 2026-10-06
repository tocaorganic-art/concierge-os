import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, MapPin, Calendar, Sparkles, MessageCircle, AlertTriangle, FolderOpen, LayoutTemplate } from "lucide-react";
import TemplateManagerDialog from "@/components/proposals/TemplateManagerDialog";
import ProposalPdfButton from "@/components/proposals/ProposalPdfButton";
import ImportarDocumentosDialog from "@/components/proposals/ImportarDocumentosDialog";
import AlertasContratuais from "@/components/proposals/AlertasContratuais";
import { useLanguage, safeLocaleDate } from "@/lib/i18n";
import { useUserProfile } from "@/lib/useUserProfile";
import { isProposalExpired } from "@/lib/proposalUtils";
import { formatBRL } from "@/lib/formatBRL";
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
  <span className="inline-flex items-center gap-1 bg-primary/15 text-primary text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-primary/20"><Sparkles className="w-2.5 h-2.5" /> IA</span>
);

export default function Proposals() {
  const { t } = useLanguage();
  const { isClient } = useUserProfile();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editProposal, setEditProposal] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [whatsappProposal, setWhatsappProposal] = useState(null);
  const [importProposal, setImportProposal] = useState(null);
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

  // Abre direto uma proposta vinda de fora (ex.: Pipeline do Dashboard,
  // achado de auditoria: antes não tinha nenhum jeito de clicar num card lá
  // e cair na proposta certa aqui). Nunca pra cliente — mesma regra do
  // clique normal na linha/card desta página (abaixo).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || isClient || proposals.length === 0) return;
    const proposal = proposals.find((p) => p.id === openId);
    if (proposal) { setEditProposal(proposal); setShowForm(true); }
    setSearchParams((prev) => { prev.delete("open"); return prev; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, isClient]);

  const { data: contratosFornecedor = [] } = useQuery({
    queryKey: ["contratos-fornecedor"],
    queryFn: () => base44.entities.ContratoFornecedor.list("-created_date", 200),
    enabled: !!importProposal,
  });

  const { data: recebimentos = [] } = useQuery({
    queryKey: ["recebimentos"],
    queryFn: () => base44.entities.Recebimento.list("-data_recebimento", 500),
    enabled: !!importProposal,
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
      p.data_chegada ? `📅 ${new Date(p.data_chegada + "T00:00:00").toLocaleDateString("pt-BR")}${p.data_saida ? ` a ${new Date(p.data_saida + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}` : "",
      p.num_pax ? `👥 ${p.num_pax} pessoa${p.num_pax > 1 ? "s" : ""}` : "",
      p.valor ? `💰 Investimento: ${formatBRL(p.valor)}` : "",
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
          !isClient && (
            <div className="hidden md:flex items-center gap-2">
              <Button onClick={() => setShowTemplates(true)} variant="outline" className="gap-2">
                <LayoutTemplate className="w-4 h-4" /> Templates
              </Button>
              <Button onClick={() => setShowAI(true)} variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles className="w-4 h-4" /> Gerar com IA <AiBadge />
              </Button>
              <Button onClick={() => { setEditProposal(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Plus className="w-4 h-4" /> {t("btn_new_proposal")}
              </Button>
            </div>
          )
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
                    className={`flex items-center gap-2 flex-wrap flex-1 ${isClient ? "" : "cursor-pointer"}`}
                    onClick={() => { if (!isClient) { setEditProposal(p); setShowForm(true); } }}
                  >
                    <p className="font-medium text-foreground">{p.client_nome}</p>
                    <StatusBadge status={p.status} />
                    {isProposalExpired(p) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
                        <AlertTriangle className="w-2.5 h-2.5" /> Expirada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.valor > 0 && (
                      <p className="font-display text-lg font-bold text-primary">
                        {formatBRL(p.valor)}
                      </p>
                    )}
                    {!isClient && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setWhatsappProposal(p); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                          title="Enviar via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <ProposalPdfButton proposal={p} />
                        <button
                          onClick={(e) => { e.stopPropagation(); setImportProposal(p); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                          title="Importar documentos"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div
                  className={`flex flex-wrap items-center gap-3 text-sm text-muted-foreground ${isClient ? "" : "cursor-pointer"}`}
                  onClick={() => { if (!isClient) { setEditProposal(p); setShowForm(true); } }}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {p.destino}
                  </span>
                  {p.data_chegada && (
                    <span className="flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(p.data_chegada + "T00:00:00").toLocaleDateString(safeLocaleDate(t))}
                      {p.data_saida && ` — ${new Date(p.data_saida + "T00:00:00").toLocaleDateString(safeLocaleDate(t))}`}
                    </span>
                  )}
                  {p.num_pax > 0 && <span className="font-mono text-xs">{p.num_pax} pax</span>}
                </div>
                <AlertasContratuais alertas={p.alertas_contratuais || []} />
              </div>
            ))}
          </div>

          {!isClient && (
            <button
              onClick={() => { setEditProposal(null); setShowForm(true); }}
              className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
              aria-label="Nova Proposta"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </>
      )}

      <ProposalFormDialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) queryClient.invalidateQueries({ queryKey: ["proposals"] }); }} proposal={editProposal} />
      <TemplateManagerDialog open={showTemplates} onOpenChange={setShowTemplates} />
      <AIProposalModal open={showAI} onOpenChange={setShowAI} onGenerated={handleAIGenerated} />

      {importProposal && (
        <ImportarDocumentosDialog
          open={!!importProposal}
          onOpenChange={(v) => { if (!v) setImportProposal(null); }}
          proposal={importProposal}
          contratosFornecedor={contratosFornecedor.filter((c) => c.proposal_id === importProposal.id)}
          recebimentos={recebimentos}
        />
      )}

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