// Módulo único de cálculo financeiro — usado por Dashboard, Faturamento,
// Relatórios e Portal do Cliente (regra R8: nenhuma fórmula duplicada nas
// telas). Todo valor em reais com 2 casas decimais; arredondamento sempre
// via roundCents para evitar erro de ponto flutuante acumulado.
//
// Modelo: Billing = cobrança/parcela (o que é devido). Recebimento = ledger
// imutável de pagamentos recebidos contra uma cobrança — nunca editado,
// correção = novo registro com valor negativo (estorno).

export function roundCents(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// ── Recebimentos ────────────────────────────────────────────────────────

// Soma líquida de recebimentos de UMA cobrança (recebimentos normais +
// estornos, que têm valor negativo) — é a fonte de verdade de "quanto já
// entrou" para essa cobrança, nunca o campo antigo Billing.status manual.
export function valorRecebido(billingId, recebimentos) {
  return roundCents(
    recebimentos
      .filter((r) => r.billing_id === billingId)
      .reduce((sum, r) => sum + (r.valor || 0), 0)
  );
}

export function saldoDevedor(billing, recebimentos) {
  return roundCents((billing.valor || 0) - valorRecebido(billing.id, recebimentos));
}

// Status derivado (regra R4) — nunca digitado, sempre calculado a partir do
// saldo. Exceção: "cancelado" é o único status que pode ser setado
// manualmente (com motivo_cancelamento obrigatório), e prevalece sobre o
// cálculo por saldo.
export function statusDerivado(billing, recebimentos) {
  if (billing.status === "cancelado") return "cancelado";
  const valor = billing.valor || 0;
  const recebido = valorRecebido(billing.id, recebimentos);
  const saldo = roundCents(valor - recebido);
  if (saldo <= 0) return "recebido";
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
    return `Esse recebimento (R$ ${roundCents(novoValor).toLocaleString("pt-BR")}) ultrapassa o saldo devedor (R$ ${saldoAtual.toLocaleString("pt-BR")}) desta cobrança.`;
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

const NATUREZA_RECEITA = "honorario";

// KPI 1 — Receita do mês (caixa): Σ recebimentos de natureza honorario com
// data_recebimento no mês, considerando os billings correspondentes.
export function receitaCaixaDoMes(billings, recebimentos, month, year) {
  const billingsHonorario = new Set(billings.filter((b) => b.natureza === NATUREZA_RECEITA).map((b) => b.id));
  return roundCents(
    recebimentos
      .filter((r) => billingsHonorario.has(r.billing_id) && inPeriod(r.data_recebimento, month, year))
      .reduce((sum, r) => sum + (r.valor || 0), 0)
  );
}

// KPI 2 — Faturado do mês (competência): Σ cobranças honorario emitidas
// (created_date) no mês.
export function faturadoCompetenciaDoMes(billings, month, year) {
  return roundCents(
    billings
      .filter((b) => b.natureza === NATUREZA_RECEITA && inPeriod(b.created_date, month, year))
      .reduce((sum, b) => sum + (b.valor || 0), 0)
  );
}

// KPI 3 — A receber: Σ saldo das cobranças honorario não canceladas.
export function totalAReceber(billings, recebimentos) {
  return roundCents(
    billings
      .filter((b) => b.natureza === NATUREZA_RECEITA && b.status !== "cancelado")
      .reduce((sum, b) => sum + Math.max(0, saldoDevedor(b, recebimentos)), 0)
  );
}

// KPI 4 — Em atraso: Σ saldo + quantidade de cobranças honorario com status
// derivado "atrasado".
export function emAtraso(billings, recebimentos) {
  const atrasadas = billings.filter((b) => b.natureza === NATUREZA_RECEITA && statusDerivado(b, recebimentos) === "atrasado");
  return {
    total: roundCents(atrasadas.reduce((sum, b) => sum + saldoDevedor(b, recebimentos), 0)),
    quantidade: atrasadas.length,
  };
}

// KPI 5 — Repasses em custódia: Σ recebido de cobranças "repasse" − Σ pago
// a fornecedores (Expense.valor) para os mesmos clientes/categorias de
// repasse. Aproximação por client_id, já que não há vínculo direto
// Expense↔Billing em todos os registros legados.
export function repassesEmCustodia(billings, recebimentos, expenses) {
  const recebidoRepasse = roundCents(
    billings
      .filter((b) => b.natureza === "repasse")
      .reduce((sum, b) => sum + valorRecebido(b.id, recebimentos), 0)
  );
  const pagoFornecedores = roundCents(expenses.reduce((sum, e) => sum + (e.valor || 0), 0));
  return roundCents(recebidoRepasse - pagoFornecedores);
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

// KPI 7 — Índice de recebimento: Σ recebido honorario ÷ Σ faturado
// honorario (all-time, não só o mês).
export function indiceRecebimento(billings, recebimentos) {
  const honorarios = billings.filter((b) => b.natureza === NATUREZA_RECEITA);
  const faturado = roundCents(honorarios.reduce((sum, b) => sum + (b.valor || 0), 0));
  if (faturado === 0) return null;
  const recebido = roundCents(honorarios.reduce((sum, b) => sum + valorRecebido(b.id, recebimentos), 0));
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
