import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildHistoryEntry, appendHistory } from "./useEventHistory";

// Adiciona um comentário ao evento (Task.comentarios). Mesma camada de
// dados (Task.update) — nunca cria entidade separada para comentários.
export default function useEventComments(task) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (texto) => {
      const trimmed = (texto || "").trim();
      if (trimmed.length < 1) throw new Error("Escreva um comentário antes de enviar.");
      const user = await base44.auth.me().catch(() => null);
      const now = new Date().toISOString();
      const novoComentario = {
        autor_id: user?.id || "",
        autor_nome: user?.full_name || user?.email || "Equipe",
        texto: trimmed,
        timestamp: now,
      };
      const comentarios = [...(task.comentarios || []), novoComentario];
      const historico = appendHistory(
        task,
        buildHistoryEntry({ tipo: "comentario", campo: "comentarios", valorAnterior: "", valorNovo: trimmed.slice(0, 60), user })
      );
      return base44.entities.Task.update(task.id, {
        comentarios,
        historico,
        editado_em: now,
        editado_por_id: user?.id || "",
        editado_por_nome: user?.full_name || user?.email || "Equipe",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
    },
  });
}
