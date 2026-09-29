// Módulo único de cálculo financeiro — usado por Dashboard, Faturamento,
// Relatórios e Portal do Cliente (regra R8: nenhuma fórmula duplicada nas
// telas). Todo valor em reais com 2 casas decimais; arredondamento sempre
// via roundCents para evitar erro de ponto flutuante acumulado.
//
// Modelo: Billing = cobrança/parcela (o que é devido). Recebimento = ledger
// imutável de pagamentos recebidos contra uma cobrança — nunca editado,
// correção = novo registro com valor negativo (estorno).

import { formatBRL } from "@/lib/formatBRL";

export function roundCents(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// ── Recebimentos ────────────────────────────────────────────────────────

// Soma líquida de recebimentos de UMA cobrança (recebimentos normais +
// estornos, que têm valor negativo) — é a fonte de verdade de "quanto já
// entrou" para essa cobrança, nunca o campo antigo Billing.status manual.
//
// Fallback legado: cobranças criadas ANTES do ledger Recebimento existir
// ficaram com status "recebido" gravado direto no Billing, sem nenhum
// registro correspondente aqui. Sem esse fallback, valorRecebido() as trata
// como "nada recebido" e o saldo/status derivado as reclassifica como
// pendente/atrasado mesmo já pagas — regressão real observada pós-publish
// (Billing 6ab95c73efec439267c6d1c0 e 6ab727454f015655ca054e7d). Só entra
// quando NÃO HÁ nenhum registro no ledger para o billing (nem recebimento
// nem estorno) — se já existe qualquer lançamento, o ledger manda.
export function valorRecebido(billing, recebimentos) {
  const doLedger = roundCents(
    recebimentos
      .filter((r) => r.billing_id === billing.id)
      .reduce((sum, r) => sum + (r.valor || 0), 0)
  );
  const temLancamentoNoLedger = recebimentos.some((r) => r.billing_id === billing.id);
  if (!temLancamentoNoLedger && billing.status === "recebido") {
    return roundCents(billing.valor || 0);
  }
  return doLedger;
}

export function saldoDevedor(billing, recebimentos) {
  return roundCents((billing.valor || 0) - valorRecebido(billing, recebimentos));
}

// Histórico de comprovantes de UMA cobrança — sempre usar isto em vez de ler
// billing.comprovante_url direto. Fallback legado: registros antigos só têm
// o campo comprovante_url (string única, sem histórico); tratamos como uma
// lista de 1 item pra não perder o que já existe.
export function comprovantesDoBilling(billing) {
  if (Array.isArray(billing.comprovantes) && billing.comprovantes.length > 0) return billing.comprovantes;
  if (billing.comprovante_url) return [{ url: billing.comprovante_url, enviado_por: null, enviado_em: null }];
  return [];
}

export function ultimoComprovante(billing) {
  const lista = comprovantesDoBilling(billing);
  return lista.length > 0 ? lista[lista.length - 1] : null;
}

// Status derivado (regra R4) — nunca digitado, sempre calculado a partir do
// saldo. Exceção: "cancelado" é o único status que pode ser setado
// manualmente (com motivo_cancelamento obrigatório), e prevalece sobre o
// cálculo por saldo.
export function statusDerivado(billing, recebimentos) {
  if (billing.status === "cancelado") return "cancelado";
  const valor = billing.valor || 0;
  const recebido = valorRecebido(billing, recebimentos);
  const saldo = roundCents(valor - recebido);
  if (saldo <= 0) return "recebido";
  // Cliente já anexou comprovante mas o admin ainda não lançou o
  // Recebimento correspondente — o próximo passo é a confirmação do
  // admin, não uma cobrança em aberto/atrasada do ponto de vista do
  // cliente (que já agiu). Só se aplica enquanto nada foi lançado ainda
  // no ledger para essa cobrança.
  if (comprovantesDoBilling(billing).length > 0 && recebido === 0) return "aguardando_confirmacao";
  if (recebido > 0) {
    const vencida = billing.data_vencimento && new Date(billing.data_vencimento) < new Date();
    return vencida ? "atrasado" : "parcialmente_recebido";
  }
  const vencida = billing.data_vencimento && new Date(billing.data_vencimento) < new Date();
  return vencida ? "atrasado" : "pendente";
}

// Regra R7: bloqueia sobrepagamento — soma de recebimentos válidos nunca
// pode ultrapassar o valor da cobrança. Retorna null se ok, ou uma
// mensagem de erro pronta pra UI.
export function validarNovoRecebimento(billing, recebimentos, novoValor, novaData) {
  if (!(novoValor > 0)) return "O valor recebido deve ser maior que zero.";
  if (novaData && new Date(novaData) > new Date()) return "A data de recebimento não pode ser futura.";
  const saldoAtual = saldoDevedor(billing, recebimentos);
  if (roundCents(novoValor) > saldoAtual + 0.009) {
    return `Esse recebimento (${formatBRL(roundCents(novoValor))}) ultrapassa o saldo devedor (${formatBRL(saldoAtual)}) desta cobrança.`;
  }
  return null;
}

// Regra R7: idempotência — mesma cobrança + valor + data + método já
// lançado pede confirmação antes de duplicar.
export function possivelDuplicata(billing, recebimentos, valor, data, metodo) {
  return recebimentos.some(
    (r) =>
      r.billing_id === billing.id &&
      !r.estorno_de_id &&
      roundCents(r.valor) === roundCents(valor) &&
      r.data_recebimento === data &&
      r.metodo === metodo
  );
}

// Mesma ideia de possivelDuplicata(), mas pra criação de Billing: mesmo
// cliente + descrição + valor + vencimento já lançado (e ainda não
// cancelado) pede confirmação antes de criar outro — não bloqueia (podem
// ser duas cobranças legitimamente iguais), só avisa. Usado no fluxo de
// "várias despesas nesta cobrança" do BillingFormDialog, onde criar N
// registros de uma vez sem esse aviso facilita duplicar por engano.
export function possivelBillingDuplicado(billings, { client_id, descricao, valor, data_vencimento }) {
  const normDescricao = (s) => (s || "").trim().toLowerCase();
  return billings.some(
    (b) =>
      b.status !== "cancelado" &&
      b.client_id === client_id &&
      normDescricao(b.descricao) === normDescricao(descricao) &&
      roundCents(b.valor) === roundCents(valor) &&
      (b.data_vencimento || "") === (data_vencimento || "")
  );
}

// ── Parcelas (regra R5) ─────────────────────────────────────────────────

// Divide um valor total em N parcelas sem erro de arredondamento — a
// diferença de centavos (se houver) vai inteira para a última parcela, de
// forma que a soma das parcelas bate exatamente com o valor total.
export function dividirEmParcelas(valorTotal, numeroParcelas) {
  const n = Math.max(2, Math.round(numeroParcelas) || 2);
  const base = Math.floor((valorTotal / n) * 100) / 100;
  const ultima = roundCents(valorTotal - base * (n - 1));
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? ultima : base));
}

// ── KPIs do Dashboard Admin (definições oficiais) ───────────────────────

function inPeriod(dateStr, month, year) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
}

// Naturezas que representam receita própria (dinheiro que fica com o
// Tony, não repassado a fornecedor nem devolvido como caução).
const NATUREZAS_RECEITA_PROPRIA = ["honorario", "intermediacao", "comissao"];

// Um Billing "misto" (preço cheio cobrado do cliente) pode conter partes de
// naturezas diferentes — ex.: uma parcela de aluguel = repasse ao
// proprietário + intermediação + honorário, todos embutidos no mesmo
// valor. Quando `alocacao` está presente, essas funções somam só as partes
// da natureza pedida; sem `alocacao`, tratam o billing.valor inteiro como
// 100% de uma natureza só (comportamento anterior, preservado).
function partesDaAlocacao(billing) {
  if (Array.isArray(billing.alocacao) && billing.alocacao.length > 0) return billing.alocacao;
  return billing.natureza ? [{ natureza: billing.natureza, valor: billing.valor || 0 }] : [];
}

function valorPorNatureza(billing, naturezas) {
  return roundCents(
    partesDaAlocacao(billing)
      .filter((a) => naturezas.includes(a.natureza))
      .reduce((sum, a) => sum + (a.valor || 0), 0)
  );
}

// Fração de um billing "misto" que já foi efetivamente recebida, aplicada a
// uma natureza específica — cada real recebido carrega a mesma proporção
// de cada componente (repasse, honorário, etc.) contido no valor cheio.
function valorPorNaturezaRecebido(billing, recebimentos, naturezas) {
  const total = valorPorNatureza(billing, naturezas);
  if (total === 0 || !billing.valor) return 0;
  const recebido = valorRecebido(billing, recebimentos);
  return roundCents(total * (recebido / billing.valor));
}

function valorPorNaturezaSaldo(billing, recebimentos, naturezas) {
  const total = valorPorNatureza(billing, naturezas);
  if (total === 0 || !billing.valor) return 0;
  const saldo = Math.max(0, saldoDevedor(billing, recebimentos));
  return roundCents(total * (saldo / billing.valor));
}

// KPI 1 — Receita do mês (caixa): receita própria (honorário + intermediação
// + comissão) efetivamente recebida no mês, olhando a data de cada
// Recebimento individual (não a data do billing). Inclui o fallback legado
// de valorRecebido(): billing com status "recebido" e nenhum lançamento no
// ledger conta pela data_pagamento.
export function receitaCaixaDoMesPorNatureza(billings, recebimentos, month, year) {
  const idsComLedger = new Set(recebimentos.map((r) => r.billing_id));
  const billingsById = new Map(billings.map((b) => [b.id, b]));
  const totals = { honorario: 0, intermediacao: 0, comissao: 0 };

  recebimentos.forEach((r) => {
    const b = billingsById.get(r.billing_id);
    if (!b || !b.valor || !inPeriod(r.data_recebimento, month, year)) return;
    partesDaAlocacao(b).forEach((parte) => {
      if (!NATUREZAS_RECEITA_PROPRIA.includes(parte.natureza)) return;
      totals[parte.natureza] += (r.valor || 0) * ((parte.valor || 0) / b.valor);
    });
  });

  billings
    .filter((b) => b.status === "recebido" && !idsComLedger.has(b.id) && inPeriod(b.data_pagamento, month, year))
    .forEach((b) => {
      partesDaAlocacao(b).forEach((parte) => {
        if (!NATUREZAS_RECEITA_PROPRIA.includes(parte.natureza)) return;
        totals[parte.natureza] += parte.valor || 0;
      });
    });

  return {
    honorario: roundCents(totals.honorario),
    intermediacao: roundCents(totals.intermediacao),
    comissao: roundCents(totals.comissao),
    total: roundCents(totals.honorario + totals.intermediacao + totals.comissao),
  };
}

export function receitaCaixaDoMes(billings, recebimentos, month, year) {
  return receitaCaixaDoMesPorNatureza(billings, recebimentos, month, year).total;
}

// Receita do mês (caixa) recebida mas ainda SEM classificação de natureza
// (cobrança sem `natureza` nem `alocacao` preenchidos — "A Classificar" na
// tela de Faturamento). Esse valor não é repasse nem caução: é dinheiro que
// entrou e não foi contado em nenhum KPI de receita própria por falta de
// classificação — achado real: cartão "Receita Própria do Mês" mostrando
// R$0 com recebimento confirmado via Pix, porque a cobrança ligada nunca
// teve a natureza definida. Existe só para alertar o operador; não decide
// sozinho como classificar (isso exige revisão humana do contrato).
export function receitaNaoClassificadaDoMes(billings, recebimentos, month, year) {
  const idsComLedger = new Set(recebimentos.map((r) => r.billing_id));
  const billingsById = new Map(billings.map((b) => [b.id, b]));
  let total = 0;

  recebimentos.forEach((r) => {
    const b = billingsById.get(r.billing_id);
    if (!b || !b.valor || !inPeriod(r.data_recebimento, month, year)) return;
    if (partesDaAlocacao(b).length === 0) total += r.valor || 0;
  });

  billings
    .filter((b) => b.status === "recebido" && !idsComLedger.has(b.id) && inPeriod(b.data_pagamento, month, year))
    .forEach((b) => {
      if (partesDaAlocacao(b).length === 0) total += b.valor || 0;
    });

  return roundCents(total);
}

// KPI 2 — Faturado do mês (competência): Σ receita própria contida em
// cobranças emitidas no mês, cheia (não proporcional ao que já foi
// recebido — competência é sobre emissão, não sobre caixa). Usa
// data_emissao (data de assinatura/emissão do contrato/cobrança) quando
// preenchida; cai para created_date só quando não há data_emissao —
// criar o registro no sistema dias/semanas depois de o contrato ter sido
// assinado não pode empurrar a competência para o mês errado (achado
// real: Adendo assinado 20/07, lançado no sistema em 26/09 — sem esse
// fallback, aparecia como faturado de setembro).
export function faturadoCompetenciaDoMes(billings, month, year) {
  return roundCents(
    billings
      .filter((b) => inPeriod(b.data_emissao || b.created_date, month, year))
      .reduce((sum, b) => sum + valorPorNatureza(b, NATUREZAS_RECEITA_PROPRIA), 0)
  );
}

// KPI 3 — A receber (receita própria): Σ saldo de receita própria das
// cobranças não canceladas — "sua receita a receber", nunca o valor cheio
// cobrado do cliente (isso é totalAReceberClientes, mais abaixo).
export function totalAReceber(billings, recebimentos) {
  return roundCents(
    billings
      .filter((b) => b.status !== "cancelado")
      .reduce((sum, b) => sum + valorPorNaturezaSaldo(b, recebimentos, NATUREZAS_RECEITA_PROPRIA), 0)
  );
}

// A receber dos clientes: Σ saldo CHEIO (repasse + intermediação + honorário
// + caução) das cobranças não canceladas — o que o cliente ainda deve no
// total, não só a parte que é receita própria do Tony.
export function totalAReceberClientes(billings, recebimentos) {
  return roundCents(
    billings
      .filter((b) => b.status !== "cancelado")
      .reduce((sum, b) => sum + Math.max(0, saldoDevedor(b, recebimentos)), 0)
  );
}

// KPI 4 — Em atraso (receita própria): Σ saldo de receita própria +
// quantidade de cobranças "atrasado" que contêm alguma parte de receita
// própria. Use emAtrasoTotal() para o valor cheio (o que o Dashboard do
// admin mostra agora, para bater com o que o cliente vê em Faturamento —
// achado real: uma cobrança 100% repasse podia estar "Atrasado" pro
// cliente e não contar aqui, porque não tinha receita própria nenhuma).
export function emAtraso(billings, recebimentos) {
  const atrasadas = billings.filter(
    (b) => valorPorNatureza(b, NATUREZAS_RECEITA_PROPRIA) > 0 && statusDerivado(b, recebimentos) === "atrasado"
  );
  return {
    total: roundCents(atrasadas.reduce((sum, b) => sum + valorPorNaturezaSaldo(b, recebimentos, NATUREZAS_RECEITA_PROPRIA), 0)),
    quantidade: atrasadas.length,
  };
}

// Em atraso (valor cheio, qualquer natureza) — mesma regra usada no
// statusDerivado() de cada linha de Faturamento, nunca filtrando por
// natureza. É este que o admin e o cliente devem ver igual.
export function emAtrasoTotal(billings, recebimentos) {
  const atrasadas = billings.filter((b) => statusDerivado(b, recebimentos) === "atrasado");
  return {
    total: roundCents(atrasadas.reduce((sum, b) => sum + saldoDevedor(b, recebimentos), 0)),
    quantidade: atrasadas.length,
  };
}

// Agrupamento por bloco — mesma convenção usada em Faturamento (Billing.jsx)
// e na Visão Geral do cliente: "Seu Contrato" (o resto), "Adicionais"
// (categoria "Contas a Pagar") e "Caução" (natureza "caucao"). Uma função só
// para não duplicar essa regra de agrupamento em cada tela.
export function agruparBillingsCliente(billings) {
  const ativos = billings.filter((b) => b.status !== "cancelado");
  const caucao = ativos.filter((b) => b.natureza === "caucao");
  const adicionais = ativos.filter((b) => (b.categoria || "").trim().toLowerCase() === "contas a pagar");
  const contrato = ativos.filter((b) => !adicionais.includes(b) && !caucao.includes(b));
  return { contrato, adicionais, caucao };
}

// KPI 5 — Repasses em custódia: Σ recebido da parte "repasse" de cada
// cobrança − Σ pago a fornecedores (Expense.valor, só as com status
// "pago" — status "pendente" é custo orçado/contratado que ainda não
// saiu do caixa, não pode ser descontado como se já tivesse sido pago).
// Aproximação por client_id, já que não há vínculo direto Expense↔Billing
// em todos os registros legados.
export function repassesEmCustodia(billings, recebimentos, expenses) {
  const recebidoRepasse = roundCents(
    billings.reduce((sum, b) => sum + valorPorNaturezaRecebido(b, recebimentos, ["repasse"]), 0)
  );
  const pagoFornecedores = roundCents(
    expenses.filter((e) => (e.status || "pago") === "pago").reduce((sum, e) => sum + (e.valor || 0), 0)
  );
  return roundCents(recebidoRepasse - pagoFornecedores);
}

// Caução em custódia: Σ recebido da parte "caucao" de cada cobrança. Ainda
// não desconta devoluções (mecanismo de devolução de caução é uma fase
// futura) — hoje reflete o total recebido do cliente a esse título.
export function caucaoEmCustodia(billings, recebimentos) {
  return roundCents(billings.reduce((sum, b) => sum + valorPorNaturezaRecebido(b, recebimentos, ["caucao"]), 0));
}

// A pagar a fornecedores: Σ ContaPagar ainda não paga.
export function totalAPagarFornecedores(contasPagar) {
  return roundCents((contasPagar || []).filter((c) => c.status !== "pago").reduce((sum, c) => sum + (c.valor || 0), 0));
}

// KPI 6 — Taxa de conversão: propostas aceitas ÷ propostas enviadas. Com
// zero enviadas, retorna null (a UI mostra "—") — corrige o "100% com zero
// propostas" do cálculo antigo, que tratava "sem propostas" como
// "100% convertido" por engano.
export function taxaConversao(proposals) {
  const enviadas = proposals.filter((p) => p.status !== "lead").length;
  if (enviadas === 0) return null;
  const aceitas = proposals.filter((p) => p.status === "confirmado" || p.status === "concluido").length;
  return Math.round((aceitas / enviadas) * 100);
}

// KPI 7 — Índice de recebimento: Σ recebido de receita própria ÷ Σ faturado
// de receita própria (all-time, não só o mês).
export function indiceRecebimento(billings, recebimentos) {
  const faturado = roundCents(billings.reduce((sum, b) => sum + valorPorNatureza(b, NATUREZAS_RECEITA_PROPRIA), 0));
  if (faturado === 0) return null;
  const saldo = roundCents(billings.reduce((sum, b) => sum + valorPorNaturezaSaldo(b, recebimentos, NATUREZAS_RECEITA_PROPRIA), 0));
  const recebido = roundCents(faturado - saldo);
  return Math.round((recebido / faturado) * 100);
}

// Série de 6 meses (Receita caixa x Faturado competência) para o gráfico do
// Dashboard — mesma fonte usada pelos KPIs 1 e 2.
export function serieReceitaFaturado6Meses(billings, recebimentos) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: d };
  });
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return months.map(({ month, year }) => ({
    name: `${monthNames[month - 1]}/${String(year).slice(2)}`,
    receita: receitaCaixaDoMes(billings, recebimentos, month, year),
    faturado: faturadoCompetenciaDoMes(billings, month, year),
  }));
}
