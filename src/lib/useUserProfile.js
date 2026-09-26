import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Resolve quem está logado e qual o tipo de acesso dele:
// admin (dono da conta), equipe (colaborador interno) ou cliente (acesso restrito ao Portal do Cliente).
// Também resolve o "auto-link": quando um perfil foi criado por convite antes da pessoa
// aceitar (sem user_id ainda), este hook vincula o user_id real no primeiro login.
export function useUserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const u = await base44.auth.me();
        if (!u || cancelled) return;
        setUser(u);

        let p = null;
        const byUserId = await base44.entities.UserProfile.filter({ user_id: u.id });
        p = byUserId?.[0] || null;

        if (!p && u.email) {
          const pending = await base44.entities.UserProfile.filter({ invite_email: u.email });
          if (pending?.[0] && !pending[0].user_id) {
            p = await base44.entities.UserProfile.update(pending[0].id, { user_id: u.id });
          } else if (pending?.[0]) {
            p = pending[0];
          }
        }

        if (!cancelled) setProfile(p);
      } catch {
        // silencioso — trata como sem perfil (equipe/admin padrão)
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const isAdmin = user?.role === "admin";
  const isClient = profile?.account_type === "cliente";
  const isTeam = Boolean(user) && !isAdmin && !isClient;

  return { user, profile, isLoading, isAdmin, isClient, isTeam };
}
