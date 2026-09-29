import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Alertas de prazo — roda diariamente via workflow "Alerta de Prazos" (notify=true, envia e-mail)
// e sob demanda pelo Dashboard (notify=false, só retorna os alertas para exibição).
// Tarefas pendentes: atrasadas, para hoje, amanhã e até 2 dias.
// Propostas ativas (lead/proposta/confirmado): chegada da viagem em até 7 dias.
const TASK_JANELA_DIAS = 2;
const PROPOSTA_JANELA_DIAS = 7;

function hojeBahia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function diasAte(dataStr, hojeStr) {
  return Math.round((Date.parse(`${dataStr}T00:00:00Z`) - Date.parse(`${hojeStr}T00:00:00Z`)) / 86400000);
}

function rotuloTarefa(dias) {
  if (dias < 0) return `atrasada há ${-dias} dia${-dias > 1 ? 's' : ''}`;
  if (dias === 0) return 'para hoje';
  if (dias === 1) return 'para amanhã';
  return `em ${dias} dias`;
}

function rotuloProposta(dias) {
  if (dias === 0) return 'chegada hoje';
  if (dias === 1) return 'chegada amanhã';
  return `chegada em ${dias} dias`;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const notify = body.notify !== false;

    const hoje = hojeBahia();

    const [tarefasPendentes, tarefasEmProgresso, leads, propostasAtivas, confirmadas] = await Promise.all([
      base44.asServiceRole.entities.Task.filter({ status: 'pendente' }),
      base44.asServiceRole.entities.Task.filter({ status: 'em_progresso' }),
      base44.asServiceRole.entities.Proposal.filter({ status: 'lead' }),
      base44.asServiceRole.entities.Proposal.filter({ status: 'proposta' }),
      base44.asServiceRole.entities.Proposal.filter({ status: 'confirmado' })
    ]);

    const alertas = [];

    for (const t of [...tarefasPendentes, ...tarefasEmProgresso]) {
      if (!t.data) continue;
      const dias = diasAte(t.data, hoje);
      if (dias > TASK_JANELA_DIAS) continue;
      alertas.push({
        tipo: 'tarefa',
        id: t.id,
        titulo: t.titulo,
        cliente: t.client_nome || null,
        prazo: t.data,
        dias,
        rotulo: rotuloTarefa(dias),
        urgente: dias <= 0
      });
    }

    for (const p of [...leads, ...propostasAtivas, ...confirmadas]) {
      if (!p.data_chegada) continue;
      const dias = diasAte(p.data_chegada, hoje);
      if (dias < 0 || dias > PROPOSTA_JANELA_DIAS) continue;
      alertas.push({
        tipo: 'proposta',
        id: p.id,
        titulo: `${p.client_nome} — ${p.destino}`,
        cliente: p.client_nome,
        prazo: p.data_chegada,
        dias,
        rotulo: rotuloProposta(dias),
        urgente: dias <= 1
      });
    }

    // Mais urgentes primeiro
    alertas.sort((a, b) => a.dias - b.dias);

    if (notify && alertas.length > 0) {
      // Blindagem (regra 0.4): só admin/equipe interna recebe este alerta.
      // Nunca uma conta cliente — mesmo que, por engano, tenha role='admin'.
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const destinatarios = [...new Set(
        admins
          .filter((u) => u.account_type !== 'cliente')
          .map((u) => u.email)
          .filter(Boolean)
      )];
      const corpo = [
        `${alertas.length} item(ns) perto do prazo:`,
        '',
        ...alertas.map((a) => `- [${a.tipo === 'tarefa' ? 'Tarefa' : 'Proposta'}] ${a.titulo}${a.cliente ? ` (cliente: ${a.cliente})` : ''} — ${a.rotulo} (${a.prazo})`),
        '',
        'Acesse o Toca OS para agir: https://tocaconciergeos.base44.app'
      ].join('\n');

      let enviados = 0;
      for (const to of destinatarios) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject: `[INTERNO] Alerta de prazo — ${alertas.length} item(ns) exigem atenção`,
          body: corpo,
          from_name: 'Toca Concierge OS — Alerta interno'
        });
        enviados += 1;
      }
      return Response.json({ status: 'ok', alertas, emails_enviados: enviados });
    }

    return Response.json({ status: 'ok', alertas, emails_enviados: 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}