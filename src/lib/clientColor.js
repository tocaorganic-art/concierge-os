// Gera uma cor determinística por cliente (mesmo client_id → sempre a mesma
// cor), sem precisar de um campo novo no banco — usado para identificar
// visualmente, no painel do admin, quando uma ação foi feita pelo próprio
// cliente (ex.: anexou um comprovante no Portal), no estilo de identificação
// por usuário/membro já comum em Notion, Linear, Trello.
export function getClientColor(clientId) {
  if (!clientId) return "hsl(220 10% 50%)";
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 55%)`;
}

// Classificação manual por cor (Client.cor_classificacao) — escolhida pela
// equipe ao criar/editar um cliente, sem significado fixo (uso livre:
// prioridade, tipo de relacionamento etc.). Paleta fixa, diferente da cor
// automática por hash acima.
export const CLASSIFICATION_COLORS = {
  vermelho: "#ef4444",
  laranja: "#f97316",
  amarelo: "#eab308",
  verde: "#22c55e",
  azul: "#3b82f6",
  roxo: "#a855f7",
  rosa: "#ec4899",
  cinza: "#6b7280",
};
