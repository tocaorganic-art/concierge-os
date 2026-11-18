// Testes das regras financeiras centrais (src/lib/finance.js).
// Rodar: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  roundCents,
  valorRecebido,
  saldoDevedor,
  statusDerivado,
  validarNovoRecebimento,
  possivelDuplicata,
  dividirEmParcelas,
  agruparBillingsCliente,
} from "../../src/lib/finance.js";

const b = (id, valor, extra = {}) => ({ id, valor, status: "pendente", ...extra });
const r = (billing_id, valor, extra = {}) => ({ id: `r-${billing_id}-${valor}`, billing_id, valor, data_recebimento: "2026-11-10", metodo: "pix", ...extra });

test("arredondamento em centavos", () => {
  assert.equal(roundCents(0.1 + 0.2), 0.3);
  assert.equal(roundCents(10.005), 10.01);
});

test("saldo devedor abate so pelo ledger", () => {
  const cobranca = b("a", 25000);
  assert.equal(saldoDevedor(cobranca, []), 25000);
  assert.equal(saldoDevedor(cobranca, [r("a", 10000)]), 15000);
  assert.equal(saldoDevedor(cobranca, [r("a", 10000), r("a", 15000)]), 0);
  assert.equal(valorRecebido(cobranca, [r("outra", 999)]), 0);
});

test("estorno (valor negativo) devolve o saldo", () => {
  const cobranca = b("s", 25000);
  const pago = r("s", 25000);
  const estorno = r("s", -25000, { estorno_de_id: pago.id });
  assert.equal(saldoDevedor(cobranca, [pago]), 0);
  assert.equal(saldoDevedor(cobranca, [pago, estorno]), 25000);
  assert.equal(statusDerivado(cobranca, [pago]), "recebido");
});

test("status derivado: parcial e cancelado", () => {
  const cobranca = b("p", 1000);
  assert.equal(statusDerivado(cobranca, [r("p", 400)]), "parcialmente_recebido");
  assert.equal(statusDerivado(b("c", 1000, { status: "cancelado" }), []), "cancelado");
});

test("sobrepagamento e valor invalido sao bloqueados", () => {
  const cobranca = b("o", 1000);
  assert.match(validarNovoRecebimento(cobranca, [r("o", 900)], 200, "2026-11-10"), /ultrapassa o saldo/);
  assert.equal(validarNovoRecebimento(cobranca, [r("o", 900)], 100, "2026-11-10"), null);
  assert.ok(validarNovoRecebimento(cobranca, [], 0, "2026-11-10"));
  assert.ok(validarNovoRecebimento(cobranca, [], 10, "2999-01-01"));
});

test("duplicata de recebimento e detectada", () => {
  const cobranca = b("d", 1000);
  const existentes = [r("d", 300)];
  assert.equal(possivelDuplicata(cobranca, existentes, 300, "2026-11-10", "pix"), true);
  assert.equal(possivelDuplicata(cobranca, existentes, 300, "2026-11-11", "pix"), false);
});

test("parcelas somam exatamente o total", () => {
  const v = dividirEmParcelas(10000.01, 3);
  assert.deepEqual(v, [3333.33, 3333.33, 3333.35]);
  assert.equal(roundCents(v.reduce((s, x) => s + x, 0)), 10000.01);
  assert.equal(dividirEmParcelas(100, 1).length, 2);
});

test("cenario Guido v20: total, pago e saldo", () => {
  const linhas = [68000, 15000, 2523.44, 25000, 24000, 25000, 2500, 3589.59, 300, 6900, 222.29, 13106, 10139.48, 2550, 250, 300]
    .map((valor, i) => b(`g${i + 1}`, valor, { categoria: "Contas a Pagar" }));
  const pagos = [[1, 68000], [2, 15000], [4, 25000], [5, 24000], [6, 25000], [10, 6900]].map(([i, v]) => r(`g${i}`, v));
  const total = roundCents(linhas.reduce((s, x) => s + x.valor, 0));
  const pago = roundCents(linhas.reduce((s, x) => s + valorRecebido(x, pagos), 0));
  const saldo = roundCents(linhas.reduce((s, x) => s + saldoDevedor(x, pagos), 0));
  assert.equal(total, 199380.8);
  assert.equal(pago, 163900);
  assert.equal(saldo, 35480.8);
  const grupos = agruparBillingsCliente(linhas);
  assert.equal(grupos.contrato.length + grupos.adicionais.length + grupos.caucao.length, linhas.length);
});
