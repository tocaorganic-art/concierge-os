import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildHistoryEntry, appendHistory } from "./useEventHistory";

// Upload/edição/remoção de fotos do evento (Task.fotos). Usa
// base44.integrations.Core.UploadFile — o mesmo utilitário já usado em
// ExpenseFormDialog para o comprovante — nunca um upload paralelo.
export default function useEventPhotos(task) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
  };

  const persist = async (fotos, historyEntry) => {
    const user = await base44.auth.me().catch(() => null);
    const now = new Date().toISOString();
    const historico = historyEntry
      ? appendHistory(task, { ...historyEntry, usuario_id: user?.id || "", usuario_nome: user?.full_name || user?.email || "Equipe" })
      : task.historico || [];
    return base44.entities.Task.update(task.id, {
      fotos,
      historico,
      editado_em: now,
      editado_por_id: user?.id || "",
      editado_por_nome: user?.full_name || user?.email || "Equipe",
    });
  };

  const upload = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const novaFoto = { url: file_url, legenda: "", timestamp: new Date().toISOString() };
      const fotos = [...(task.fotos || []), novaFoto];
      return persist(fotos, buildHistoryEntry({ tipo: "foto", campo: "fotos", valorAnterior: "", valorNovo: "1 foto adicionada" }));
    },
    onSuccess: invalidate,
  });

  const updateLegenda = useMutation({
    mutationFn: async ({ index, legenda }) => {
      const fotos = (task.fotos || []).map((f, i) => (i === index ? { ...f, legenda } : f));
      return persist(fotos, null);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (index) => {
      const fotos = (task.fotos || []).filter((_, i) => i !== index);
      return persist(fotos, buildHistoryEntry({ tipo: "foto", campo: "fotos", valorAnterior: "1 foto removida", valorNovo: "" }));
    },
    onSuccess: invalidate,
  });

  return { upload, updateLegenda, remove };
}
