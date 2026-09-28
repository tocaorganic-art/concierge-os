import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Exporta o faturamento do mês para uma planilha nova no Google Sheets
// (conexão compartilhada — a conta Google conectada do dono do app).
// Cria 2 abas: "Faturamento" (cobranças do mês com recebido/saldo) e
// "Custos" (despesas do mês, incluindo custos/margem com fornecedores).
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const NATUREZA_LABEL = {
  honorario: 'Honorário',
  intermediacao: 'Intermediação',
  comissao: 'Comissão',
  repasse: 'Repasse (custo fornecedor)',
  caucao: 'Caução',
  a_classificar: 'A classificar',
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Uso interno: só admin ou equipe (contas "cliente" nunca exportam).
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const accountType = user?.data?.account_type || 'equipe';
    if (user.role !== 'admin' && accountType !== 'equipe') {
      return Response.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const hoje = new Date();
    const mes = Number(body.mes) || hoje.getMonth() + 1;
    const ano = Number(body.ano) || hoje.getFullYear();
    const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
    const noMes = (data) => (data ? String(data).slice(0, 7) === prefixo : false);

    const [billings, recebimentos, despesas] = await Promise.all([
      base44.asServiceRole.entities.Billing.list('-created_date', 500),
      base44.asServiceRole.entities.Recebimento.list('-data_recebimento', 1000),
      base44.asServiceRole.entities.Expense.list('-data_despesa', 500),
    ]);

    // Recebido por cobrança (soma TODOS os lançamentos — estornos entram
    // negativos, mesmo critério de saldo do app).
    const recebidoPor = {};
    for (const r of recebimentos) {
      if (!r.billing_id) continue;
      recebidoPor[r.billing_id] = (recebidoPor[r.billing_id] || 0) + Number(r.valor || 0);
    }

    const diaDe = (d) => (d ? String(d).slice(0, 10) : '');

    const linhasFat = [
      ['Cliente', 'Descrição', 'Categoria', 'Natureza', 'Vencimento', 'Emissão', 'Valor (R$)', 'Recebido (R$)', 'Saldo (R$)', 'Status'],
    ];
    for (const b of billings) {
      if (!(noMes(b.data_vencimento) || noMes(b.data_emissao) || noMes(b.created_date))) continue;
      const recebido = recebidoPor[b.id] || 0;
      const saldo = Math.max((b.valor || 0) - recebido, 0);
      let status;
      if (b.status === 'cancelado') status = 'Cancelado';
      else if (saldo <= 0) status = 'Recebido';
      else if (recebido > 0) status = 'Parcial';
      else if (b.data_vencimento && diaDe(b.data_vencimento) < diaDe(hoje.toISOString())) status = 'Atrasado';
      else status = 'Pendente';
      linhasFat.push([
        b.client_nome || '—',
        b.descricao || '',
        b.categoria || '',
        NATUREZA_LABEL[b.natureza] || b.natureza || '',
        diaDe(b.data_vencimento),
        diaDe(b.data_emissao),
        Number(b.valor || 0),
        recebido,
        saldo,
        status,
      ]);
    }

    const linhasCustos = [
      ['Data', 'Cliente', 'Categoria', 'Fornecedor', 'Descrição', 'Valor pago (R$)', 'Cobrado do cliente (R$)', 'Margem (interno)', 'Status'],
    ];
    for (const e of despesas) {
      if (!(noMes(e.data_despesa) || noMes(e.created_date))) continue;
      linhasCustos.push([
        diaDe(e.data_despesa),
        e.client_nome || '',
        e.categoria || '',
        e.fornecedor || '',
        e.descricao || '',
        Number(e.valor || 0),
        e.valor_cobrado_cliente != null ? Number(e.valor_cobrado_cliente) : '',
        e.margem_admin != null ? Number(e.margem_admin) : '',
        e.status || 'pago',
      ]);
    }

    if (linhasFat.length === 1 && linhasCustos.length === 1) {
      return Response.json({ status: 'sem_dados', mes, ano });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // 1) Cria a planilha
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers,
      body: JSON.stringify({ properties: { title: `Faturamento ${MESES[mes - 1]} ${ano} — Toca Concierge` } }),
    });
    if (!createRes.ok) {
      const detalhe = await createRes.text();
      return Response.json({ error: `Google Sheets: ${detalhe}` }, { status: 500 });
    }
    const sheet = await createRes.json();
    const sheetId = sheet.spreadsheetId;

    // 2) Renomeia a aba padrão e cria a aba de custos
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requests: [
          { updateSheetProperties: { properties: { sheetId: 0, title: 'Faturamento' }, fields: 'title' } },
          { addSheet: { properties: { title: 'Custos' } } },
        ],
      }),
    });

    // 3) Escreve os dados
    const put = (tab, values) =>
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values }),
      });

    if (linhasFat.length > 1) await put('Faturamento', linhasFat);
    if (linhasCustos.length > 1) await put('Custos', linhasCustos);

    return Response.json({
      status: 'ok',
      mes,
      ano,
      cobrancas: linhasFat.length - 1,
      custos: linhasCustos.length - 1,
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}