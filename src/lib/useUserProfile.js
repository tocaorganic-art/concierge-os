import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { linkInvitedAccount } from "@/functions/linkInvitedAccount";

// Resolve quem está logado e qual o tipo de acesso dele:
// admin (dono da conta), equipe (colaborador interno) ou cliente (acesso restrito ao Portal do Cliente).
//
// No primeiro login depois de um convite, ainda não existe account_type/client_id no usuário —
// então este hook chama a function linkInvitedAccount (com service role no backend) para vincular
// o convite pendente (criado em Configurações > Minha Equipe) e gravar account_type/client_id
// com segurança. Isso nunca é algo que o próprio usuário escreve em si mesmo.
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

        if (!u.account_type && u.email) {
          try {
            await linkInvitedAccount({ user: { id: u.id, email: u.email } });
            u = await base44.auth.me();
          } catch {
            // sem convite pendente, ou falha ao vincular — segue como equipe padrão
          }
        }

        if (cancelled) return;
        setUser(u);

        const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
        if (!cancelled) setProfile(profiles?.[0] || null);
      } catch {
        // silencioso
      } finally {
        if (!cancelled) setIsLoading(false);
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
