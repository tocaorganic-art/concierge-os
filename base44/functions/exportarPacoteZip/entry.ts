import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import JSZip from 'npm:jszip@3.10.1';

// Gera um ZIP com TUDO discriminado: despesas, pagamentos recebidos,
// cobranças na visão do cliente, resumo e todos os comprovantes/documentos
// anexados (despesas, recebimentos, contratos, documentos de cliente/admin,
// contratos de fornecedor, contas a pagar e fotos de eventos).
// Os arquivos originais são copiados para dentro do ZIP, com o nome legível
// prefixado pela data e pelo item a que pertencem.
const NATUREZA_LABEL: Record<string, string> = {
  honorario: 'Honorário',
  intermediacao: 'Intermediação',
  comissao: 'Comissão',
  repasse: 'Repasse',
  caucao: 'Caução',
  a_classificar: 'A classificar',
};

const METODO_LABEL: Record<string, string> = {
  pix: 'Pix',
  transferencia: 'Transferência',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};

const CONTA_LABEL: Record<string, string> = {
  pix_cpf_tony: 'Pix CPF Tony',
  pix_pj_cora: 'Pix PJ Cora',
};

const diaDe = (d?: string) => (d ? String(d).slice(0, 10) : '');
const br = (d?: string) => (d ? diaDe(d).split('-').reverse().join('/') : '');
const num = (v: any) => (Number(v) || 0).toFixed(2).replace('.', ',');
const limpar = (s: any) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'arquivo';

const csv = (linhas: any[][]) =>
  '\uFEFF' + linhas.map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');

const extensao = (url: string) => {
  const semQuery = url.split('?')[0];
  const ext = semQuery.split('.').pop() || '';
  return ext.length > 1 && ext.length <= 5 ? ext.toLowerCase() : 'bin';
};

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const accountType = user?.data?.account_type || 'equipe';
    if (user.role !== 'admin' && accountType !== 'equipe') {
      return Response.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const [despesas, billings, recebimentos, propostas, fornecedores, contas, tasks] = await Promise.all([
      base44.asServiceRole.entities.Expense.list('-data_despesa', 500),
      base44.asServiceRole.entities.Billing.list('-created_date', 500),
      base44.asServiceRole.entities.Recebimento.list('-data_recebimento', 1000),
      base44.asServiceRole.entities.Proposal.list('-created_date', 100),
      base44.asServiceRole.entities.ContratoFornecedor.list('-created_date', 100),
      base44.asServiceRole.entities.ContaPagar.list('-created_date', 200),
      base44.asServiceRole.entities.Task.list('-created_date', 300),
    ]);

    // ── Cálculos (mesma regra do app) ────────────────────────────────────
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
    const billsAtivos = (billings as any[]).filter((b) => b.status !== 'cancelado');
    const billsPorId = new Map((billings as any[]).map((b) => [b.id, b]));

    const despesasOrd = [...(despesas as any[])].sort((a, b) =>
      String(b.data_despesa || b.created_date || '').localeCompare(String(a.data_despesa || a.created_date || ''))
    );
    const recebimentosOrd = [...(recebimentos as any[])].sort((a, b) =>
      String(b.data_recebimento || b.created_date || '').localeCompare(String(a.data_recebimento || a.created_date || ''))
    );

    const totalPago = despesasOrd.filter((e) => (e.status || 'pago') === 'pago').reduce((s, e) => s + Number(e.valor || 0), 0);
    const totalPendente = despesasOrd.filter((e) => (e.status || 'pago') !== 'pago').reduce((s, e) => s + Number(e.valor || 0), 0);
    const totalRecebido = recebimentosOrd.reduce((s, r) => s + Number(r.valor || 0), 0);

    // ── Arquivos a anexar ────────────────────────────────────────────────
    type Anexo = { pasta: string; nomeBase: string; url: string; item: string };
    const anexos: Anexo[] = [];
    const jaIncluido = new Set<string>();

    const add = (pasta: string, nomeBase: string, url: string, item: string) => {
      if (!url || jaIncluido.has(url)) return;
      jaIncluido.add(url);
      anexos.push({ pasta, nomeBase, url, item });
    };

    despesasOrd.forEach((e) => {
      const nome = `${br(e.data_despesa) || 'sem-data'}_${limpar(e.categoria)}_${limpar(e.descricao).slice(0, 40)}`;
      if (e.comprovante_url) add('comprovantes/despesas', nome, e.comprovante_url, e.descricao);
    });

    recebimentosOrd.forEach((r) => {
      const b = billsPorId.get(r.billing_id) as any;
      const nome = `${br(r.data_recebimento) || 'sem-data'}_${num(r.valor)}_${limpar(b?.descricao || 'recebimento').slice(0, 40)}`;
      if (r.comprovante_url) add('comprovantes/pagamentos', nome, r.comprovante_url, b?.descricao || 'Recebimento');
    });

    (billings as any[]).forEach((b) => {
      const nome = `${limpar(b.descricao).slice(0, 40)}_${num(b.valor)}`;
      (b.comprovantes || []).forEach((c: any) => add('comprovantes/cobrancas', nome, c?.url, b.descricao));
      if (b.comprovante_url) add('comprovantes/cobrancas', nome, b.comprovante_url, b.descricao);
    });

    (propostas as any[]).forEach((p) => {
      if (p.contrato_assinado_url) add('documentos/contratos-clientes', `contrato-assinado_${limpar(p.client_nome)}`, p.contrato_assinado_url, `Contrato assinado — ${p.client_nome}`);
      (p.documentos_cliente || []).forEach((d: any) =>
        add('documentos/documentos-cliente', limpar(d?.nome || 'documento'), d?.url, `Documento do cliente — ${d?.nome || ''}`)
      );
      (p.documentos_admin || []).forEach((d: any) =>
        add('documentos/documentos-internos', limpar(d?.nome || 'documento'), d?.url, `Documento interno — ${d?.nome || ''}`)
      );
    });

    (fornecedores as any[]).forEach((c: any) => {
      if (c.documento_url) add('documentos/contratos-fornecedores', `contrato_${limpar(c.fornecedor_nome)}`, c.documento_url, `Contrato de fornecedor — ${c.fornecedor_nome}`);
    });

    (contas as any[]).forEach((c: any) => {
      if (c.comprovante_url)
        add('comprovantes/contas-a-pagar', `${br(c.data_vencimento) || 'sem-data'}_${limpar(c.fornecedor_nome)}`, c.comprovante_url, `Conta a pagar — ${c.fornecedor_nome}`);
    });

    (tasks as any[]).forEach((t: any) => {
      (t.fotos || []).forEach((f: any) =>
        add('documentos/fotos-eventos', `${br(t.data) || 'sem-data'}_${limpar(t.titulo).slice(0, 30)}`, f?.url, `Foto de evento — ${t.titulo}`)
      );
    });

    // ── ZIP: planilhas primeiro ──────────────────────────────────────────
    const zip = new JSZip();

    const resumoLinhas: any[][] = [
      ['RESUMO — Toca Concierge'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      [''],
      ['DESPESAS'],
      ['Lançamentos', despesasOrd.length],
      ['Total de despesas (R$)', num(totalPago + totalPendente)],
      ['Total pago (R$)', num(totalPago)],
      ['Total pendente (R$)', num(totalPendente)],
      [''],
      ['PAGAMENTOS RECEBIDOS'],
      ['Lançamentos', recebimentosOrd.length],
      ['Total recebido (R$)', num(totalRecebido)],
      [''],
      ['COBRANÇAS (VISÃO DO CLIENTE)'],
      ['Cobranças ativas', billsAtivos.length],
      ['Contratado (R$)', num(billsAtivos.reduce((s, b) => s + Number(b.valor || 0), 0))],
      ['Recebido (R$)', num(billsAtivos.reduce((s, b) => s + recebidoDe(b), 0))],
      ['Saldo em aberto (R$)', num(billsAtivos.reduce((s, b) => s + Math.max(Number(b.valor || 0) - recebidoDe(b), 0), 0))],
      [''],
      ['ARQUIVOS ANEXADOS'],
      ['Documentos no pacote', anexos.length],
      ...anexos.map((a) => [a.pasta, a.nomeBase]),
    ];
    zip.file('RESUMO.csv', csv(resumoLinhas));

    const linhasDespesas: any[][] = [
      ['Data', 'Cliente', 'Categoria', 'Fornecedor', 'Descrição', 'Situação', 'Valor (R$)', 'Comprovante'],
    ];
    despesasOrd.forEach((e) => {
      linhasDespesas.push([
        br(e.data_despesa),
        e.client_nome || '',
        e.categoria || '',
        e.fornecedor || '',
        e.descricao || '',
        (e.status || 'pago') === 'pago' ? 'Pago' : 'Pendente',
        num(e.valor),
        e.comprovante_url ? 'sim' : '',
      ]);
    });
    linhasDespesas.push(['TOTAL PAGO', '', '', '', '', '', num(totalPago)]);
    linhasDespesas.push(['TOTAL PENDENTE', '', '', '', '', '', num(totalPendente)]);
    linhasDespesas.push(['TOTAL GERAL', '', '', '', '', '', num(totalPago + totalPendente)]);
    zip.file('DESPESAS.csv', csv(linhasDespesas));

    const linhasPagamentos: any[][] = [
      ['Data', 'Cliente', 'Cobrança', 'Método', 'Conta destino', 'Valor (R$)', 'Estorno?', 'Observação', 'Comprovante'],
    ];
    recebimentosOrd.forEach((r) => {
      const b = billsPorId.get(r.billing_id) as any;
      linhasPagamentos.push([
        br(r.data_recebimento),
        b?.client_nome || '',
        b?.descricao || '',
        METODO_LABEL[r.metodo] || r.metodo || '',
        CONTA_LABEL[r.conta_destino] || '',
        num(r.valor),
        r.estorno_de_id ? 'Sim' : '',
        r.observacao || r.motivo_estorno || '',
        r.comprovante_url ? 'sim' : '',
      ]);
    });
    linhasPagamentos.push(['TOTAL RECEBIDO', '', '', '', '', num(totalRecebido)]);
    zip.file('PAGAMENTOS.csv', csv(linhasPagamentos));

    const linhasCobrancas: any[][] = [
      ['Cliente', 'Descrição', 'Categoria', 'Natureza', 'Vencimento', 'Emissão', 'Valor (R$)', 'Recebido (R$)', 'Saldo (R$)', 'Situação'],
    ];
    let somaValor = 0;
    let somaRec = 0;
    let somaSaldo = 0;
    billsAtivos.forEach((b) => {
      const recebido = recebidoDe(b);
      const saldo = Math.max(Number(b.valor || 0) - recebido, 0);
      somaValor += Number(b.valor || 0);
      somaRec += recebido;
      somaSaldo += saldo;
      let situacao = 'Pendente';
      if (saldo <= 0) situacao = 'Recebido';
      else if (recebido > 0) situacao = 'Parcial';
      else if (b.data_vencimento && diaDe(b.data_vencimento) < hoje) situacao = 'Atrasado';
      linhasCobrancas.push([
        b.client_nome || '',
        b.descricao || '',
        b.categoria || '',
        NATUREZA_LABEL[b.natureza] || b.natureza || '',
        br(b.data_vencimento),
        br(b.data_emissao),
        num(b.valor),
        num(recebido),
        num(saldo),
        situacao,
      ]);
    });
    linhasCobrancas.push(['TOTAIS', '', '', '', '', '', num(somaValor), num(somaRec), num(somaSaldo)]);
    zip.file('COBRANCAS-VISAO-CLIENTE.csv', csv(linhasCobrancas));

    // ── ZIP: baixa e anexa os arquivos ───────────────────────────────────
    const usados = new Set<string>();
    const falhas: string[] = [];

    for (let i = 0; i < anexos.length; i += 6) {
      const lote = anexos.slice(i, i + 6);
      const resultados = await Promise.allSettled(
        lote.map(async (a) => {
          const res = await fetch(a.url, { signal: AbortSignal.timeout(30000) });
          if (!res.ok) throw new Error(`${a.url} → HTTP ${res.status}`);
          return { a, bytes: new Uint8Array(await res.arrayBuffer()) };
        })
      );
      resultados.forEach((r, idx) => {
        const a = lote[idx];
        if (r.status !== 'fulfilled') {
          falhas.push(`${a.nomeBase} (${a.item})`);
          return;
        }
        let caminho = `${a.pasta}/${a.nomeBase}.${extensao(a.url)}`;
        let contador = 2;
        while (usados.has(caminho)) caminho = `${a.pasta}/${a.nomeBase}-${contador++}.${extensao(a.url)}`;
        usados.add(caminho);
        zip.file(caminho, r.value.bytes);
      });
    }

    if (falhas.length > 0) {
      zip.file('ARQUIVOS-NAO-BAIXADOS.csv', csv([['Item que não pôde ser baixado'], ...falhas.map((f) => [f])]));
    }

    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const nomeZip = `toca-concierge-${new Date().toISOString().slice(0, 10)}.zip`;

    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
      file: new File([bytes], nomeZip, { type: 'application/zip' }),
    });
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 3600,
    });

    return Response.json({
      status: 'ok',
      despesas: despesasOrd.length,
      pagamentos: recebimentosOrd.length,
      cobrancas: billsAtivos.length,
      arquivos: usados.size,
      falhas: falhas.length,
      tamanho_mb: Math.round((bytes.length / 1048576) * 10) / 10,
      download_url: signed_url,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}