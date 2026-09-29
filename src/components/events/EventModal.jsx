import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/shared/StatusBadge";
import EventStatusBadge from "./EventStatusBadge";
import PhotoUpload from "./PhotoUpload";
import PhotoGallery from "./PhotoGallery";
import CommentsThread from "./CommentsThread";
import EventChecklist from "./EventChecklist";
import EventTimeline from "./EventTimeline";
import EventPdfButton from "./EventPdfButton";
import useEventUpdate, { buildHistoryEntry } from "@/hooks/useEventUpdate";
import useEventComments from "@/hooks/useEventComments";
import useEventPhotos from "@/hooks/useEventPhotos";
import { Loader2, CheckCircle2 } from "lucide-react";

// Modal completo e reutilizável de evento — abre ao clicar em qualquer
// card da Agenda (src/pages/Agenda.jsx), qualquer que seja o `tipo`
// (chamada/visita/proposta/operacao). Não existe entidade "Event" no
// Base44 — "evento" aqui é a mesma entidade Task já usada em toda a
// Agenda/Dashboard; este modal só adiciona uma camada de edição rica em
// cima dela (fotos, checklist, comentários, status, responsável,
// histórico), sem duplicar a lógica de criação já existente em
// TaskFormDialog (que continua servindo o fluxo "Nova Tarefa").
//
// IMPORTANTE: este modal só é usado na Agenda (uso interno da equipe).
// O widget "Próximos eventos" do Dashboard é a visão do CLIENTE
// (DashboardProximosEventos.jsx, renderizado só em isClientMode) e
// continua somente-leitura de propósito — a RLS de Task só permite
// update para quem criou a tarefa ou admin, então o cliente não teria
// como salvar mudanças por ali mesmo se o modal fosse aberto lá.
export default function EventModal({ task, onClose }) {
  const [observacao, setObservacao] = useState("");
  const [savingObs, setSavingObs] = useState("idle"); // idle | saving | saved
  const [obsError, setObsError] = useState("");

  const updateEvent = useEventUpdate(task || {});
  const addComment = useEventComments(task || {});
  const photos = useEventPhotos(task || {});

  const { data: equipe = [] } = useQuery({
    queryKey: ["equipe-users"],
    queryFn: () => base44.entities.User.filter({ account_type: "equipe" }, "full_name", 100),
    enabled: !!task,
  });

  useEffect(() => {
    setObservacao(task?.descricao || "");
    setObsError("");
    setSavingObs("idle");
  }, [task?.id]);

  // Auto-save da observação, com debounce de 2s (requisito do checklist).
  useEffect(() => {
    if (!task) return;
    if (observacao === (task.descricao || "")) return;
    setObsError("");
    const trimmed = observacao.trim();
    if (trimmed.length > 0 && trimmed.length < 5) {
      setObsError("Mínimo de 5 caracteres.");
      return;
    }
    setSavingObs("saving");
    const timer = setTimeout(() => {
      updateEvent.mutate(
        {
          patch: { descricao: observacao },
          historyEntry: buildHistoryEntry({ tipo: "observacao", campo: "descricao", valorAnterior: task.descricao, valorNovo: observacao }),
        },
        {
          onSuccess: () => { setSavingObs("saved"); setTimeout(() => setSavingObs("idle"), 1500); },
          onError: (e) => { setObsError(e?.message || "Falha ao salvar."); setSavingObs("idle"); },
        }
      );
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observacao]);

  if (!task) return null;

  const handleStatusChange = (novoStatus) => {
    updateEvent.mutate({
      patch: { status: novoStatus },
      historyEntry: buildHistoryEntry({ tipo: "status", campo: "status", valorAnterior: task.status, valorNovo: novoStatus }),
    });
  };

  const handleResponsavelChange = (userId) => {
    const membro = equipe.find((u) => u.id === userId);
    updateEvent.mutate({
      patch: { responsavel_id: userId, responsavel_nome: membro?.full_name || membro?.email || "" },
      historyEntry: buildHistoryEntry({ tipo: "responsavel", campo: "responsavel_id", valorAnterior: task.responsavel_nome, valorNovo: membro?.full_name || membro?.email }),
    });
  };

  const handleChecklistChange = (checklist) => {
    updateEvent.mutate({
      patch: { checklist },
      historyEntry: buildHistoryEntry({ tipo: "checklist", campo: "checklist", valorAnterior: `${(task.checklist || []).filter((i) => i.concluido).length}/${(task.checklist || []).length}`, valorNovo: `${checklist.filter((i) => i.concluido).length}/${checklist.length}` }),
    });
  };

  return (
    <Dialog open={!!task} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="font-display text-xl truncate">{task.titulo}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                {task.tipo && <StatusBadge status={task.tipo} />}
                {task.client_nome && <span className="text-xs text-muted-foreground">· {task.client_nome}</span>}
                {task.editado_por_nome && (
                  <span className="text-[11px] text-muted-foreground">
                    · Última edição: {task.editado_por_nome} em {task.editado_em ? new Date(task.editado_em).toLocaleString("pt-BR") : ""}
                  </span>
                )}
              </div>
            </div>
            <EventPdfButton task={task} />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status + Responsável */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={task.status || "pendente"} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_progresso">Em progresso</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-1.5"><EventStatusBadge status={task.status || "pendente"} /></div>
            </div>
            <div>
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Responsável</Label>
              <Select value={task.responsavel_id || ""} onValueChange={handleResponsavelChange}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border">
                  <SelectValue placeholder="Atribuir..." />
                </SelectTrigger>
                <SelectContent>
                  {equipe.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observação (auto-save) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Observação</Label>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                {savingObs === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</>}
                {savingObs === "saved" && <><CheckCircle2 className="w-3 h-3 text-green-400" /> Salvo</>}
              </span>
            </div>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              className="bg-secondary border-border"
              placeholder="Anotações sobre este evento (mínimo 5 caracteres)..."
            />
            {obsError && <p className="text-xs text-red-400 mt-1">{obsError}</p>}
          </div>

          {/* Fotos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Fotos / evidências</Label>
              <PhotoUpload uploading={photos.upload.isPending} onUpload={(file) => photos.upload.mutateAsync(file)} />
            </div>
            <PhotoGallery
              fotos={task.fotos || []}
              onUpdateLegenda={(index, legenda) => photos.updateLegenda.mutate({ index, legenda })}
              onRemove={(index) => photos.remove.mutate(index)}
            />
          </div>

          {/* Checklist */}
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Checklist</Label>
            <EventChecklist checklist={task.checklist || []} tipo={task.tipo} onChange={handleChecklistChange} />
          </div>

          {/* Comentários */}
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Comentários</Label>
            <CommentsThread
              comentarios={task.comentarios || []}
              isPending={addComment.isPending}
              onAdd={(texto) => addComment.mutateAsync(texto)}
            />
          </div>

          {/* Histórico */}
          <div>
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Histórico</Label>
            <EventTimeline historico={task.historico || []} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
