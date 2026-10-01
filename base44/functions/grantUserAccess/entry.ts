import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Libera o acesso (equipe ou cliente) de um e-mail que JÁ tem conta no app.
//
// Por que existe: a entidade User não pode ser listada nem alterada pelo
// navegador ("Permission denied for list operation on User entity"), então o
// botão Convidar de Configurações > Minha Equipe quebrava com qualquer e-mail
// — a checagem "esse e-mail já tem conta?" era um User.list() no frontend. Aqui
// a checagem e a gravação rodam com service role, e só para quem é admin.
//
// POST { email, account_type: 'equipe'|'cliente', client_id? }
// Respostas: { status: 'linked' } | { status: 'not_found' } (e-mail sem conta —
// o frontend segue para o convite normal) | { status: 'admin_protected' }.
//
// Contas com role = admin nunca são rebaixadas por aqui: virar "cliente"
// derrubava o acesso admin da própria operação (incidente real em produção).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Apenas o admin pode liberar acessos.' }, { status: 403 });
    }

    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const accountType = body.account_type === 'cliente' ? 'cliente' : 'equipe';
    const clientId = accountType === 'cliente' ? String(body.client_id || '') : '';

    if (!email) return Response.json({ error: 'E-mail obrigatório.' }, { status: 400 });
    if (accountType === 'cliente' && !clientId) {
      return Response.json({ error: 'Escolha o cliente para vincular.' }, { status: 400 });
    }

    const encontrados = await base44.asServiceRole.entities.User.filter({ email });
    const existente = (encontrados || []).find((u) => (u.email || '').toLowerCase() === email);
    if (!existente) return Response.json({ status: 'not_found' });

    if (existente.role === 'admin') {
      return Response.json({ status: 'admin_protected' });
    }

    await base44.asServiceRole.entities.User.update(existente.id, {
      account_type: accountType,
      client_id: clientId,
    });

    const dadosPerfil = { account_type: accountType, client_id: clientId, invite_email: email };
    const perfis = await base44.asServiceRole.entities.UserProfile.filter({ user_id: existente.id });
    if (perfis?.[0]) {
      await base44.asServiceRole.entities.UserProfile.update(perfis[0].id, dadosPerfil);
    } else {
      await base44.asServiceRole.entities.UserProfile.create({ user_id: existente.id, plan_id: 'trial', ...dadosPerfil });
    }

    return Response.json({ status: 'linked', account_type: accountType });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
