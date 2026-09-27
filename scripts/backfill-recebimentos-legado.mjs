// Backfill idempotente: cria um Recebimento para cada Billing legado que já
// está com status "recebido" gravado direto no campo (de antes do ledger
// Recebimento existir) e ainda não tem nenhum lançamento no ledger.
//
// Idempotente: antes de criar, verifica se já existe QUALQUER Recebimento
// para aquele billing_id (recebimento normal ou estorno) — se existir, pula.
// Rodar quantas vezes for preciso; nunca duplica.
//
// Uso: node scripts/backfill-recebimentos-legado.mjs
// Requer as mesmas credenciais/sessão que o app usa para chamar o SDK
// (@base44/sdk) — rodar autenticado como admin.

import { base44 } from "../src/api/base44Client.js";

async function main() {
  const [billings, recebimentos] = await Promise.all([
    base44.entities.Billing.list("-data_vencimento", 2000),
    base44.entities.Recebimento.list("-data_recebimento", 2000),
  ]);

  const idsComLedger = new Set(recebimentos.map((r) => r.billing_id));
  const legados = billings.filter((b) => b.status === "recebido" && !idsComLedger.has(b.id));

  if (legados.length === 0) {
    console.log("Nenhum Billing legado pendente de backfill. Nada a fazer.");
    return;
  }

  for (const b of legados) {
    if (!b.data_pagamento) {
      console.log(`PULADO (sem data_pagamento, precisa de confirmação manual): ${b.id} — ${b.descricao || b.client_nome}`);
      continue;
    }
    await base44.entities.Recebimento.create({
      billing_id: b.id,
      client_id: b.client_id,
      valor: b.valor,
      data_recebimento: b.data_pagamento,
      metodo: "outro",
      observacao: "backfill legado",
    });
    console.log(`CRIADO: Recebimento de R$ ${b.valor} para Billing ${b.id} (${b.descricao || b.client_nome})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
