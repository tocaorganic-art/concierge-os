import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Roda diariamente (ver workflow "Alerta de Pagamentos Pendentes").
// Avisa por e-mail 2 dias antes do vencimento, e todo dia até o dia do vencimento.
const DIAS_ANTECEDENCIA = 2;

function diasAte(dataStr) {
  const vencimento = new Date(`${dataStr}T00:00:00Z`);
  const hoje = new Date();
  const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  return Math.round((vencimento.getTime() - hojeUTC.getTime()) / 86400000);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const pendentes = await base44.asServiceRole.entities.Billing.filter({ status: 'pendente' });
    const alvos = pendentes
      .map((b) => ({ ...b, _dias: b.data_vencimento ? diasAte(b.data_vencimento) : null }))
      .filter((b) => b._dias !== null && b._dias >= 0 && b._dias <= DIAS_ANTECEDENCIA);

    if (alvos.length === 0) {
      return Response.json({ status: 'sem_alertas_hoje' });
    }

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const destinatarios = [...new Set(admins.map((u) => u.email).filter(Boolean))];

    let enviados = 0;
    for (const b of alvos) {
      const urgencia = b._dias === 0 ? 'VENCE HOJE' : `vence em ${b._dias} dia${b._dias > 1 ? 's' : ''}`;
      const assunto = `[Concierge OS] Pagamento pendente — ${b.client_nome} — ${urgencia}`;
      const linkDashboard = 'https://tocaconciergeos.base44.app/portal';
      const corpo = [
        `Cliente: ${b.client_nome}`,
        `Descrição: ${b.descricao || '—'}`,
        `Valor: R$ ${Number(b.valor || 0).toLocaleString('pt-BR')}`,
        `Vencimento: ${b.data_vencimento}`,
        `Status: ${urgencia}`,
        '',
        `Link do dashboard do cliente (envie para o cliente cobrar/lembrar): ${linkDashboard}`,
        '',
        'Este alerta é gerado automaticamente pelo Concierge OS (2 dias antes até o dia do vencimento).',
      ].join('\n');

      for (const to of destinatarios) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject: assunto,
          body: corpo,
          from_name: 'Toca Concierge OS',
        });
        enviados += 1;
      }
    }

    return Response.json({ status: 'ok', cobrancas_alertadas: alvos.length, emails_enviados: enviados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
