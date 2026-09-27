// Uma proposta só é considerada "expirada" enquanto ainda está em
// negociação (lead/proposta) e a data_validade já passou — depois de
// confirmada/concluída/cancelada, a validade deixa de ter efeito.
export function isProposalExpired(proposal) {
  if (!proposal?.data_validade) return false;
  if (!["lead", "proposta"].includes(proposal.status)) return false;
  const validade = new Date(proposal.data_validade + "T23:59:59");
  return validade < new Date();
}
