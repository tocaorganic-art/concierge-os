import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MapPin, Calendar, Users as UsersIcon, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardBannerHeader from "@/components/dashboard/DashboardBannerHeader";
import ProposalFormDialog from "@/components/proposals/ProposalFormDialog";
import { isProposalExpired } from "@/lib/proposalUtils";
import { formatBRL } from "@/lib/formatBRL";

const stages = [
  { key: "lead", label: "Lead", dotColor: "bg-blue-400" },
  { key: "proposta", label: "Proposta", dotColor: "bg-amber-400" },
  { key: "confirmado", label: "Confirmado", dotColor: "bg-green-400" },
  { key: "concluido", label: "Concluído", dotColor: "bg-primary" },
];

function ProposalCard({ p, provided, snapshot, onMoveLeft, onMoveRight, stageIdx }) {
  return (
    <div
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
      {...(provided?.dragHandleProps || {})}
      className={`bg-card border rounded-lg p-4 transition-all cursor-grab active:cursor-grabbing ${
        snapshot?.isDragging
          ? "border-primary/60 shadow-xl shadow-primary/20 opacity-90 rotate-1 scale-105"
          : "border-border gold-border-hover"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <p className="font-medium text-sm text-foreground">{p.client_nome}</p>
        {isProposalExpired(p) && (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase text-red-400 bg-red-500/10 px-1 py-0.5 rounded-full border border-red-500/20">
            <AlertTriangle className="w-2 h-2" /> Expirada
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{p.destino}</span>
      </div>
      {p.data_chegada && (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>{new Date(p.data_chegada).toLocaleDateString("pt-BR")}</span>
        </div>
      )}
      {p.num_pax > 0 && (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
          <UsersIcon className="w-3 h-3" />
          <span>{p.num_pax} pax</span>
        </div>
      )}
      {p.valor > 0 && (
        <p className="font-display text-base font-bold text-primary">
          {formatBRL(p.valor)}
        </p>
      )}
      {/* Mobile move buttons */}
      {(onMoveLeft || onMoveRight) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <button
            onClick={onMoveLeft}
            disabled={!onMoveLeft}
            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-mono bg-secondary text-muted-foreground hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> {stageIdx > 0 ? stages[stageIdx - 1].label : ""}
          </button>
          <button
            onClick={onMoveRight}
            disabled={!onMoveRight}
            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-mono bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {stageIdx < stages.length - 1 ? stages[stageIdx + 1].label : ""} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const [showForm, setShowForm] = useState(false);
  const [mobileStageIdx, setMobileStageIdx] = useState(0);
  const queryClient = useQueryClient();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list("-created_date", 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Proposal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposals"] }),
  });

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const proposalId = result.draggableId;
    const proposal = proposals.find((p) => p.id === proposalId);
    if (proposal && proposal.status !== newStatus) {
      updateMutation.mutate({ id: proposalId, data: { status: newStatus } });
    }
  };

  const moveProposal = (proposalId, direction) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return;
    const currentIdx = stages.findIndex((s) => s.key === proposal.status);
    const newIdx = currentIdx + direction;
    if (newIdx < 0 || newIdx >= stages.length) return;
    updateMutation.mutate({ id: proposalId, data: { status: stages[newIdx].key } });
  };

  const currentStage = stages[mobileStageIdx];
  const mobileItems = proposals.filter((p) => p.status === currentStage.key);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <DashboardBannerHeader
        data={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        bannerVideoUrl="https://media.base44.com/videos/public/6a1f06cb2529a2c8784acc2c/059002cd8_gemini_generated_video_e6f924d9.mp4"
        alt="Trancoso Resolve — Quem resolve, pertinho de você"
        categorias={[]}
        showInfo={false}
      />
      <div className="hidden md:flex justify-end mb-4">
        <Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Nova Proposta
        </Button>
      </div>

      {/* ── DESKTOP: Kanban drag & drop ── */}
      <div className="hidden md:block">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-4 gap-4">
            {stages.map((stage) => {
              const items = proposals.filter((p) => p.status === stage.key);
              const colTotal = items.reduce((sum, p) => sum + (p.valor || 0), 0);
              return (
                <div key={stage.key} className="bg-card/50 border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1 pb-3 border-b border-border">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {stage.label}
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                      {items.length}
                    </span>
                  </div>
                  {colTotal > 0 && (
                    <p className="font-display text-xs text-primary mb-3">
                      {formatBRL(colTotal)}
                    </p>
                  )}
                  <Droppable droppableId={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[200px] transition-colors rounded-lg p-1 ${
                          snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
                        }`}
                      >
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-center text-xs text-muted-foreground/50 py-8">Arraste aqui</p>
                        )}
                        {items.map((p, idx) => (
                          <Draggable key={p.id} draggableId={p.id} index={idx}>
                            {(provided, snapshot) => (
                              <ProposalCard p={p} provided={provided} snapshot={snapshot} />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* ── MOBILE: Uma coluna com botões de mover ── */}
      <div className="md:hidden">
        <div className="flex items-center gap-1.5 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setMobileStageIdx((i) => Math.max(0, i - 1))} disabled={mobileStageIdx === 0} className="h-8 w-8 flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 flex gap-1 min-w-0">
            {stages.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setMobileStageIdx(i)}
                className={`flex-1 min-w-0 py-1.5 px-1 rounded-lg text-[10px] font-mono uppercase tracking-wide transition-all overflow-hidden ${
                  i === mobileStageIdx
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <span className="block truncate">{s.label}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileStageIdx((i) => Math.min(stages.length - 1, i + 1))} disabled={mobileStageIdx === stages.length - 1} className="h-8 w-8 flex-shrink-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className={`w-2.5 h-2.5 rounded-full ${currentStage.dotColor}`} />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{currentStage.label}</span>
          <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{mobileItems.length}</span>
          {mobileItems.length > 0 && (
            <span className="ml-auto font-display text-xs text-primary">
              {formatBRL(mobileItems.reduce((s, p) => s + (p.valor || 0), 0))}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {mobileItems.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">Nenhuma proposta nesta etapa</div>
          )}
          {mobileItems.map((p) => (
            <ProposalCard
              key={p.id}
              p={p}
              stageIdx={mobileStageIdx}
              onMoveLeft={mobileStageIdx > 0 ? () => moveProposal(p.id, -1) : null}
              onMoveRight={mobileStageIdx < stages.length - 1 ? () => moveProposal(p.id, 1) : null}
            />
          ))}
        </div>
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="Nova Proposta"
      >
        <Plus className="w-6 h-6" />
      </button>

      <ProposalFormDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}