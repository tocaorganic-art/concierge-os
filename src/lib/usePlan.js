import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// App de uso exclusivo do dono: acesso completo liberado, sem travas de plano.
// Returns { plan, trialDaysLeft, isLoading }
export function usePlan() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const u = await base44.auth.me();
        if (u) setUser(u);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const isAgency = true;
  const hasProAccess = true;
  const hasAgencyAccess = true;

  return { plan: "agency", trialDaysLeft: null, isLoading, user, isStarter: false, isPro: true, isAgency, isTrial: false, hasProAccess, hasAgencyAccess };
}