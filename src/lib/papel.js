// Resolve o papel de quem está logado (admin | cliente | equipe) a partir do
// User e do UserProfile. Existe separado do hook para poder ser testado.
//
// Por que não é só `user.account_type === "cliente"`: no primeiro login de um
// convidado, o User é criado com account_type = "equipe" (default do schema) e
// só vira "cliente" DEPOIS que a function linkInvitedAccount roda. O servidor
// já libera os dados do cliente (RLS usa client_id), mas o auth.me() lido logo
// em seguida pode devolver o User ainda sem o vínculo — e o app, cacheando isso,
// montava o painel de ADMIN para o cliente (incidente real: viu "valor cheio
// (repasse + receita própria)" e o onboarding de operador). O UserProfile
// pendente já carrega account_type/client_id do convite desde o início, então
// ele serve de segunda fonte e fecha a janela.
//
// Regra de segurança: admin NUNCA entra em modo cliente (ele já tem "Ver como
// cliente"); uma conta admin com account_type "cliente" por engano não pode
// trancar o dono fora do painel.
export function resolverPapel(user, profile) {
  if (!user) return { user: null, isAdmin: false, isClient: false, isTeam: false };

  const isAdmin = user.role === "admin";
  const clienteNoUser = user.account_type === "cliente";
  const clienteNoPerfil = profile?.account_type === "cliente" && Boolean(profile?.client_id);
  const isClient = !isAdmin && (clienteNoUser || clienteNoPerfil);

  const userResolvido = isClient
    ? { ...user, account_type: "cliente", client_id: user.client_id || profile?.client_id || "" }
    : user;

  return { user: userResolvido, isAdmin, isClient, isTeam: !isAdmin && !isClient };
}

// O assistente de configuração da operação (nome do negócio, primeiro cliente,
// primeira proposta) é só de quem opera o Toca OS. Nunca para cliente.
export function deveMostrarOnboardingOperador({ user, isClient }) {
  return Boolean(user) && !isClient && user.first_login !== false;
}
