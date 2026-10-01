import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Disparado no primeiro carregamento de uma conta (useUserProfile chama em
// todo login). Vincula o perfil pendente (criado em Configurações > Minha
// Equipe, por invite_email) à conta real e — só nesse momento, com service
// role, nunca pelo próprio usuário — grava account_type/client_id no User,
// o que é o que dá acesso ao Portal do Cliente.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const newUser = body.user || {};

    if (!newUser.email || !newUser.id) {
      return Response.json({ status: 'skipped_no_email' });
    }

    const pendings = await base44.asServiceRole.entities.UserProfile.filter({ invite_email: newUser.email });
    // Só vincula convites AINDA não vinculados (user_id vazio). Perfis já
    // vinculados — a outro usuário ou a esta mesma — nunca são reprocessados.
    const pending = (pendings || []).find((p) => !p.user_id);

    if (!pending) {
      return Response.json({ status: 'no_pending_invite' });
    }

    // Confere a conta de verdade no banco (o payload do frontend pode vir
    // incompleto) e só vincula contas RECENTES — criadas nas últimas 24h,
    // ou seja, recém-nascidas do aceite de um convite. Uma conta ANTIGA que
    // faz login (ex.: o dono testando) com um e-mail que por acaso consta num
    // convite pendente NÃO pode ser sequestrada pelo vínculo — era isso que
    // virava a conta do dono em "cliente" (conflito de contas em produção).
    let rec = null;
    try {
      rec = await base44.asServiceRole.entities.User.get(newUser.id);
    } catch (e) {
      rec = null;
    }
    if (!rec) {
      return Response.json({ status: 'skipped_no_user_record' });
    }
    const criadoHaMs = Date.now() - new Date(rec.created_date).getTime();
    if (!(criadoHaMs >= 0 && criadoHaMs < 24 * 60 * 60 * 1000)) {
      return Response.json({ status: 'skipped_existing_user' });
    }

    await base44.asServiceRole.entities.UserProfile.update(pending.id, { user_id: newUser.id });

    if (pending.account_type === 'cliente') {
      await base44.asServiceRole.entities.User.update(newUser.id, {
        account_type: 'cliente',
        client_id: pending.client_id || '',
      });
    }

    return Response.json({ status: 'linked', account_type: pending.account_type || 'equipe', client_id: pending.client_id || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}