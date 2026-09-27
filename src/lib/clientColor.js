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
