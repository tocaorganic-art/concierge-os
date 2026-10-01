// Fase 4 — divisão repasse/margem em um lugar só. Mesma regra usada pelo
// botão "Dividir automaticamente" do BillingFormDialog e pela geração
// automática de cobranças a partir da leitura de contrato por IA
// (LeituraContratoModal): o valor cobrado do cliente vira repasse até
// cobrir todo o custo fechado com os fornecedores daquela viagem, e só o
// que sobra depois disso é margem própria (intermediacao).
//
// Nada aqui grava no banco nem decide sozinho: devolve a `alocacao` pronta
// no formato de Billing.alocacao (ver base44/entities/Billing.jsonc) para a
// tela confirmar com o Tony antes de salvar.

import { roundCents, valorPorNatureza } from "@/lib/finance";

export function custoFornecedoresTotal(contratos = []) {
  return roundCents(contratos.reduce((sum, c) => sum + (c.custo_total || 0), 0));
}

// Repasse já classificado em OUTRAS cobranças da mesma proposta — pra não
// repassar de novo um custo que já foi coberto.
export function repasseJaAlocado(billings = [], proposalId, excludeBillingId = null) {
  if (!proposalId) return 0;
  return roundCents(
    billings
      .filter((b) => b.proposal_id === proposalId && b.id !== excludeBillingId && b.status !== "cancelado")
      .reduce((sum, b) => sum + valorPorNatureza(b, ["repasse"]), 0)
  );
}

export function custoFornecedorPendente(contratos, billings, proposalId, excludeBillingId = null) {
  return Math.max(0, roundCents(custoFornecedoresTotal(contratos) - repasseJaAlocado(billings, proposalId, excludeBillingId)));
}

// Divide UM valor: repasse primeiro (até o custo pendente), margem no resto.
export function splitRepasseMargem(valor, custoPendente) {
  const v = roundCents(Number(valor) || 0);
  const repasse = roundCents(Math.min(Math.max(0, roundCents(custoPendente)), v));
  const intermediacao = roundCents(v - repasse);
  return {
    repasse,
    intermediacao,
    alocacao: [
      ...(repasse > 0 ? [{ natureza: "repasse", valor: repasse }] : []),
      ...(intermediacao > 0 ? [{ natureza: "intermediacao", valor: intermediacao }] : []),
    ],
  };
}

// Divide uma SEQUÊNCIA de parcelas consumindo o custo pendente na ordem:
// a 1ª parcela cobre o custo do fornecedor até onde dá, a 2ª continua de
// onde a 1ª parou, e a margem própria só aparece depois que o custo total
// está coberto. Ex. contrato de R$55.000 em 2x R$27.500 com fornecedor de
// R$38.000: parcela 1 = 100% repasse (27.500), parcela 2 = 10.500 de
// repasse + 17.000 de margem.
export function splitParcelasRepasseMargem(parcelas = [], custoPendente = 0) {
  let restante = Math.max(0, roundCents(custoPendente));
  return parcelas.map((p) => {
    const divisao = splitRepasseMargem(p.valor, restante);
    restante = roundCents(restante - divisao.repasse);
    return { ...p, ...divisao };
  });
}
