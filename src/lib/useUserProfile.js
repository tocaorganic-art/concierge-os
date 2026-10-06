import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { resolverPapel } from "@/lib/papel";

// Resolve quem está logado e qual o tipo de acesso dele:
// admin (dono da conta), equipe (colaborador interno) ou cliente (acesso restrito ao Portal do Cliente).
//
// No primeiro login depois de um convite, o convite pendente (criado em Configurações > Minha
// Equipe) ainda não foi vinculado a este usuário — então este hook chama a function
// linkInvitedAccount (com service role no backend) para vincular e gravar account_type/client_id
// com segurança. Isso nunca é algo que o próprio usuário escreve em si mesmo.
//
// IMPORTANTE: não dá pra decidir "precisa vincular?" checando `!u.account_type` — o schema do
// User define `account_type` com `default: "equipe"`, e o Base44 aplica esse default já na
// criação da conta. Ou seja, `u.account_type` NUNCA chega vazio aqui, mesmo para quem tem um
// convite de "cliente" pendente — a checagem antiga nunca disparava, e o vínculo falhava
// silenciosamente (bug real encontrado em produção). Por isso sempre tentamos vincular; a
// function em si já é barata e idempotente quando não há convite pendente.
//
// useQuery (em vez de useState/useEffect manual) por um motivo especifico: este hook é chamado
// de forma independente em 10+ componentes (AppLayout, Dashboard, FloatingChat, Sidebar...), e
// SEM cache compartilhado cada um deles disparava sua PRÓPRIA cadeia auth.me() +
// linkInvitedAccount + UserProfile.filter() em paralelo — 7+ chamadas simultâneas de
// linkInvitedAccount num único carregamento, travando a tela ~20-30s (bug real visto em
// produção). useQuery deduplica automaticamente chamadas simultâneas com a mesma queryKey (uma
// única cadeia de rede, não N) e cacheia o resultado — staleTime alto porque vincular convite +
// resolver o papel do usuário não precisa re-rodar a cada navegação entre páginas.
async function loadUserAndProfile() {
  let u = await base44.auth.me();
  if (!u) return { user: null, profile: null };

  if (u.email) {
    try {
      const result = await base44.functions.invoke("linkInvitedAccount", { user: { id: u.id, email: u.email } });
      if (result?.status === "linked") {
        u = await base44.auth.me();
        // O auth.me() logo após o vínculo pode vir sem account_type/client_id
        // novos; a resposta da própria function é a fonte confiável aqui.
        if (result.account_type === "cliente" && u.account_type !== "cliente") {
          u = { ...u, account_type: "cliente", client_id: result.client_id || u.client_id || "" };
        }
      }
    } catch {
      // sem convite pendente, ou falha ao vincular — segue como está
    }
  }

  const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
  return { user: u, profile: profiles?.[0] || null };
}

export function useUserProfile() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-profile-and-link"],
    queryFn: loadUserAndProfile,
    // Achado de auditoria (0.A — "cliente vendo o dashboard de admin",
    // intermitente): esta query decide o LAYOUT inteiro (admin x cliente,
    // src/components/layout/AppLayout.jsx) e, com staleTime de 5 minutos e
    // o default global de refetchOnWindowFocus desligado (ver
    // src/lib/query-client.js), uma aba aberta por mais tempo NUNCA
    // reconferia o papel sozinha — só remontando o layout (logout/login,
    // que o SDK sempre faz via reload de página completa, ver
    // node_modules/@base44/sdk .../modules/auth.js:logout). Se o papel do
    // usuário mudar no servidor enquanto a aba já está aberta (reclassificar
    // uma conta de teste, corrigir um vínculo de convite, etc.), a aba podia
    // continuar mostrando o papel ANTIGO por tempo indefinido. Mantém o
    // staleTime curto (não zero, pra não re-disparar linkInvitedAccount a
    // cada clique) e liga refetchOnWindowFocus só nesta query, já que é
    // uma decisão de acesso/segurança — vale o refetch extra ao focar a aba.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const papel = useMemo(() => resolverPapel(data?.user || null, data?.profile || null), [data]);
  const profile = data?.profile || null;

  return { user: papel.user, profile, isLoading, isAdmin: papel.isAdmin, isClient: papel.isClient, isTeam: papel.isTeam };
}
