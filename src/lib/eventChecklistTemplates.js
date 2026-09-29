// Templates de checklist por tipo de evento (Task.tipo).
// Usados só como SUGESTÃO inicial ao criar o checklist de um evento sem
// nenhum item ainda — nunca sobrescrevem um checklist já existente.
// Adicionar um novo tipo aqui não exige mudar nenhum componente do modal
// de eventos (EventModal/EventChecklist) — é só consultar este mapa.
export const EVENT_CHECKLIST_TEMPLATES = {
  visita: [
    "Tirar foto do relógio de energia",
    "Anotar leitura do relógio",
    "Conferir estado geral do imóvel",
    "Assinar termo de vistoria",
  ],
  operacao: [
    "Confirmar horário do voo/transfer",
    "Confirmar motorista/veículo",
    "Enviar localização em tempo real ao cliente",
    "Confirmar chegada com o cliente",
  ],
  chamada: [
    "Preparar pauta da ligação",
    "Registrar decisões da conversa",
  ],
  proposta: [
    "Revisar valores antes de enviar",
    "Enviar proposta ao cliente",
    "Registrar retorno do cliente",
  ],
};

export function buildChecklistFromTemplate(tipo) {
  const items = EVENT_CHECKLIST_TEMPLATES[tipo] || [];
  const now = new Date().toISOString();
  return items.map((titulo, i) => ({
    id: `tpl-${Date.now()}-${i}`,
    titulo,
    concluido: false,
    timestamp: now,
  }));
}
