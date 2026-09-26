import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Disparado quando uma conta de usuário é criada (aceite de convite).
// Vincula o perfil pendente (criado em Configurações > Minha Equipe, por invite_email)
// à conta real, e — só nesse momento, com service role, nunca pelo próprio usuário —
// grava account_type/client_id no User, o que é o que dá acesso ao Portal do Cliente.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const newUser = body.user || {};

    if (!newUser.email) {
      return Response.json({ status: 'skipped_no_email' });
    }

    const pendings = await base44.asServiceRole.entities.UserProfile.filter({ invite_email: newUser.email });
    const pending = pendings?.[0];

    if (!pending) {
      return Response.json({ status: 'no_pending_invite' });
    }

    if (!pending.user_id) {
      await base44.asServiceRole.entities.UserProfile.update(pending.id, { user_id: newUser.id });
    }

    if (pending.account_type === 'cliente') {
      await base44.asServiceRole.entities.User.update(newUser.id, {
        account_type: 'cliente',
        client_id: pending.client_id || '',
      });
    }

    return Response.json({ status: 'linked', account_type: pending.account_type || 'equipe' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
