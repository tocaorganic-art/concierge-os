import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Gera uma planilha nova no Google Sheets (conexão compartilhada) com 2 abas:
// "Despesas x Pago" (todas as despesas discriminadas, com resumo e total por
// categoria — sem cálculo de lucro/margem) e "Visão do Cliente" (as cobranças
// do jeito que o cliente vê no Faturamento: valor, recebido, saldo, situação).
const NATUREZA_LABEL: Record<string, string> = {
  honorario: 'Honorário',
  intermediacao: 'Intermediação',
  comissao: 'Comissão',
  repasse: 'Repasse',
  caucao: 'Caução',
  a_classificar: 'A classificar',
};

const br = (d?: string) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const diaDe = (d?: string) => (d ? String(d).slice(0, 10) : '');
const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const accountType = user?.data?.account_type || 'equipe';
    if (user.role !== 'admin' && accountType !== 'equipe') {
      return Response.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const clientId: string | null = body.client_id || null;

    const [despesas, billings, recebimentos] = await Promise.all([
      base44.asServiceRole.entities.Expense.list('-data_despesa', 500),
      base44.asServiceRole.entities.Billing.list('-created_date', 500),
      base44.asServiceRole.entities.Recebimento.list('-data_recebimento', 1000),
    ]);

    // ── Aba 1: Despesas x Pago ──────────────────────────────────────────
    const ordenadas = [...despesas].sort((a: any, b: any) =>
      String(b.data_despesa || b.created_date || '').localeCompare(String(a.data_despesa || a.created_date || ''))
    );

    const tabDespesas: any[][] = [['Data', 'Cliente', 'Categoria', 'Fornecedor', 'Descrição', 'Situação', 'Valor (R$)']];
    let totalPago = 0;
    let totalPendente = 0;
    let qtdPago = 0;
    let qtdPendente = 0;
    const porCategoria: Record<string, { total: number; pago: number; pendente: number }> = {};

    for (const e of ordenadas as any[]) {
      const pago = (e.status || 'pago') === 'pago';
      const valor = Number(e.valor || 0);
      if (pago) {
        totalPago += valor;
        qtdPago += 1;
      } else {
        totalPendente += valor;
        qtdPendente += 1;
      }
      const cat = e.categoria || 'Sem categoria';
      porCategoria[cat] = porCategoria[cat] || { total: 0, pago: 0, pendente: 0 };
      porCategoria[cat].total += valor;
      if (pago) porCategoria[cat].pago += valor;
      else porCategoria[cat].pendente += valor;

      tabDespesas.push([
        br(e.data_despesa),
        e.client_nome || '',
        cat,
        e.fornecedor || '',
        e.descricao || '',
        pago ? 'Pago' : 'Pendente',
        valor,
      ]);
    }

    tabDespesas.push(['']);
    tabDespesas.push(['RESUMO']);
    tabDespesas.push([`Total de despesas (${ordenadas.length} lançamentos)`, '', '', '', '', '', round2(totalPago + totalPendente)]);
    tabDespesas.push([`Total pago (${qtdPago} lançamentos)`, '', '', '', '', '', round2(totalPago)]);
    tabDespesas.push([`Total pendente (${qtdPendente} lançamentos)`, '', '', '', '', '', round2(totalPendente)]);
    tabDespesas.push(['']);
    tabDespesas.push(['Categoria', 'Total (R$)', 'Pago (R$)', 'Pendente (R$)']);
    Object.entries(porCategoria)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([cat, v]) => tabDespesas.push([cat, round2(v.total), round2(v.pago), round2(v.pendente)]));

    // ── Aba 2: Visão do Cliente ─────────────────────────────────────────
    const recebidoPor = new Map<string, number>();
    for (const r of recebimentos as any[]) {
      if (!r.billing_id) continue;
      recebidoPor.set(r.billing_id, (recebidoPor.get(r.billing_id) || 0) + Number(r.valor || 0));
    }
    const temLedger = new Set((recebimentos as any[]).map((r) => r.billing_id));

    const recebidoDe = (b: any) => {
      const doLedger = recebidoPor.get(b.id) || 0;
      if (!temLedger.has(b.id) && b.status === 'recebido') return Number(b.valor || 0);
      return doLedger;
    };

    const hoje = diaDe(new Date().toISOString());
    const doCliente = (billings as any[]).filter(
      (b) => b.status !== 'cancelado' && (!clientId || b.client_id === clientId)
    );

    const tabCliente: any[][] = [
      ['Cliente', 'Descrição', 'Categoria', 'Natureza', 'Vencimento', 'Valor (R$)', 'Recebido (R$)', 'Saldo (R$)', 'Situação'],
    ];
    let somaValor = 0;
    let somaRecebido = 0;
    let somaSaldo = 0;

    for (const b of doCliente) {
      const recebido = round2(recebidoDe(b));
      const saldo = round2(Math.max((b.valor || 0) - recebido, 0));
      let situacao = 'Pendente';
      if (saldo <= 0) situacao = 'Recebido';
      else if (recebido > 0) situacao = 'Parcial';
      else if (b.data_vencimento && diaDe(b.data_vencimento) < hoje) situacao = 'Atrasado';

      somaValor += Number(b.valor || 0);
      somaRecebido += recebido;
      somaSaldo += saldo;

      tabCliente.push([
        b.client_nome || '',
        b.descricao || '',
        b.categoria || '',
        NATUREZA_LABEL[b.natureza] || b.natureza || '',
        br(b.data_vencimento),
        Number(b.valor || 0),
        recebido,
        saldo,
        situacao,
      ]);
    }

    tabCliente.push(['']);
    tabCliente.push(['TOTAIS', '', '', '', '', round2(somaValor), round2(somaRecebido), round2(somaSaldo)]);

    // ── Google Sheets ───────────────────────────────────────────────────
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    const hojeBr = new Date().toLocaleDateString('pt-BR');

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        properties: { title: `Toca Concierge — Despesas x Pago e Visão do Cliente (${hojeBr})` },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!createRes.ok) {
      return Response.json({ error: `Google Sheets: ${await createRes.text()}` }, { status: 500 });
    }
    const sheetId = (await createRes.json()).spreadsheetId;

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requests: [
          { updateSheetProperties: { properties: { sheetId: 0, title: 'Despesas x Pago' }, fields: 'title' } },
          { addSheet: { properties: { title: 'Visão do Cliente' } } },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    const put = (tab: string, values: any[][]) =>
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}!A1?valueInputOption=USER_ENTERED`,
        { method: 'PUT', headers, body: JSON.stringify({ values }), signal: AbortSignal.timeout(30000) }
      );

    const [r1, r2] = await Promise.all([put('Despesas x Pago', tabDespesas), put('Visão do Cliente', tabCliente)]);
    if (!r1.ok || !r2.ok) {
      return Response.json({ error: 'Falha ao escrever as abas na planilha' }, { status: 500 });
    }

    return Response.json({
      status: 'ok',
      despesas: ordenadas.length,
      cobrancas: doCliente.length,
      total_despesas: round2(totalPago + totalPendente),
      total_pago: round2(totalPago),
      total_pendente: round2(totalPendente),
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}