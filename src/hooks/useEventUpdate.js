import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildHistoryEntry, appendHistory } from "./useEventHistory";

// Hook central de atualização do modal de eventos. Usa a MESMA camada de
// dados da criação (base44.entities.Task.update — igual ao
// TaskFormDialog/Agenda), nunca uma mutation paralela. Toda chamada:
//  1. valida o mínimo (observação com pelo menos 5 caracteres, quando enviada)
//  2. registra editado_em/editado_por_id/editado_por_nome
//  3. acrescenta uma entrada em `historico` (nunca sobrescreve o array)
export default function useEventUpdate(task) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
  };

  return useMutation({
    mutationFn: async ({ patch, historyEntry }) => {
      if (patch.observacoes != null && patch.observacoes.trim().length > 0 && patch.observacoes.trim().length < 5) {
        throw new Error("A observação precisa ter pelo menos 5 caracteres.");
      }
      const user = await base44.auth.me().catch(() => null);
      const data = {
        ...patch,
        editado_em: new Date().toISOString(),
        editado_por_id: user?.id || "",
        editado_por_nome: user?.full_name || user?.email || "Equipe",
      };
      if (historyEntry) {
        const entry = { ...historyEntry, usuario_id: user?.id || "", usuario_nome: user?.full_name || user?.email || "Equipe" };
        data.historico = appendHistory(task, entry);
      }
      return base44.entities.Task.update(task.id, data);
    },
    onSuccess: invalidate,
  });
}

export { buildHistoryEntry };
