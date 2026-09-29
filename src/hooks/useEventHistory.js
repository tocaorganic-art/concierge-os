// Helpers de histórico/timeline do modal de eventos. Não é um hook de
// React Query em si — é a função pura que monta a entrada de histórico,
// usada pelos outros hooks (useEventUpdate, useEventComments, useEventPhotos)
// antes de cada Task.update, para que TODA mudança feita pelo modal de
// eventos fique registrada em `historico` (Task.jsonc).
export function buildHistoryEntry({ tipo, campo, valorAnterior, valorNovo, user }) {
  return {
    tipo,
    campo,
    valor_anterior: valorAnterior == null ? "" : String(valorAnterior),
    valor_novo: valorNovo == null ? "" : String(valorNovo),
    usuario_id: user?.id || "",
    usuario_nome: user?.full_name || user?.email || "Equipe",
    timestamp: new Date().toISOString(),
  };
}

export function appendHistory(task, entry) {
  return [...(task.historico || []), entry];
}

export function formatHistoryEntry(entry) {
  const quando = entry.timestamp ? new Date(entry.timestamp).toLocaleString("pt-BR") : "";
  const quem = entry.usuario_nome || "Equipe";
  switch (entry.tipo) {
    case "status":
      return `${quem} mudou o status de "${entry.valor_anterior}" para "${entry.valor_novo}" — ${quando}`;
    case "responsavel":
      return `${quem} atribuiu o responsável para "${entry.valor_novo}" — ${quando}`;
    case "observacao":
      return `${quem} editou a observação — ${quando}`;
    case "foto":
      return `${quem} adicionou uma foto — ${quando}`;
    case "comentario":
      return `${quem} comentou — ${quando}`;
    case "checklist":
      return `${quem} atualizou o checklist ("${entry.valor_novo}") — ${quando}`;
    case "criacao":
      return `${quem} criou o evento — ${quando}`;
    default:
      return `${quem} editou "${entry.campo}" — ${quando}`;
  }
}
