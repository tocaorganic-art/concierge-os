import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MapPin, Calendar, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import ProposalFormDialog from "@/components/proposals/ProposalFormDialog";

const stages = [
  { key: "lead", label: "Lead", color: "bg-blue-500", dotColor: "bg-blue-400" },
  { key: "proposta", label: "Proposta", color: "bg-amber-500", dotColor: "bg-amber-400" },
  { key: "confirmado", label: "Confirmado", color: "bg-green-500", dotColor: "bg-green-400" },
  { key: "concluido", label: "Concluído", color: "bg-primary", dotColor: "bg-primary" },
];

export default function Pipeline() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: proposals = [] } = useQuery({
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

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle="Acompanhe suas propostas por etapa"
        action={
          <Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Proposta
          </Button>
        }
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {stages.map((stage) => {
            const items = proposals.filter((p) => p.status === stage.key);
            return (
              <div key={stage.key} className="bg-card/50 border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {stage.label}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    {items.length}
                  </span>
                </div>
                <Droppable droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] transition-colors rounded-lg p-1 ${
                        snapshot.isDraggingOver ? "bg-primary/5" : ""
                      }`}
                    >
                      {items.map((p, idx) => (
                        <Draggable key={p.id} draggableId={p.id} index={idx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-card border border-border rounded-lg p-4 gold-border-hover cursor-grab active:cursor-grabbing transition-all ${
                                snapshot.isDragging ? "shadow-lg shadow-primary/10 rotate-1" : ""
                              }`}
                            >
                              <p className="font-medium text-sm text-foreground mb-2">{p.client_nome}</p>
                              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
                                <MapPin className="w-3 h-3" />
                                <span>{p.destino}</span>
                              </div>
                              {p.data_chegada && (
                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
                                  <Calendar className="w-3 h-3" />
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
                                  R$ {p.valor?.toLocaleString("pt-BR")}
                                </p>
                              )}
                            </div>
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

      <ProposalFormDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}