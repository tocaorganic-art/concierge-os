import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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
export function useUserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let u = await base44.auth.me();
        if (!u || cancelled) return;

        if (u.email) {
          try {
            const result = await base44.functions.invoke("linkInvitedAccount", { user: { id: u.id, email: u.email } });
            if (result?.status === "linked") {
              u = await base44.auth.me();
            }
          } catch {
            // sem convite pendente, ou falha ao vincular — segue como está
          }
        }

        if (cancelled) return;
        setUser(u);

        const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
        if (!cancelled) setProfile(profiles?.[0] || null);
      } catch {
        // silencioso
      } finally {
        // Sempre resolve isLoading, mesmo se o efeito foi cancelado por uma
        // remontagem do componente pai (ex.: durante a navegação inicial do
        // React Router) — do contrário isLoading pode ficar preso em `true`
        // para sempre, e o gate de isClient em AppLayout.jsx nunca reavalia,
        // deixando telas internas (Faturamento, Despesas, Clientes) acessíveis
        // por navegação direta de URL para contas do tipo "cliente".
        setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const isAdmin = user?.role === "admin";
  const isClient = user?.account_type === "cliente";
  const isTeam = Boolean(user) && !isAdmin && !isClient;

  return { user, profile, isLoading, isAdmin, isClient, isTeam };
}
