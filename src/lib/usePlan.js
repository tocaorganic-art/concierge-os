import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Returns { plan, trialDaysLeft, isLoading }
// plan: 'trial' | 'starter' | 'pro' | 'agency'
// trialDaysLeft: number (negative = expired)
export function usePlan() {
  const [plan, setPlan] = useState(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const u = await base44.auth.me();
        if (!u) { setIsLoading(false); return; }
        setUser(u);

        // Try to find a UserProfile for this user
        const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
        let profile = profiles?.[0];

        if (!profile) {
          // Auto-create trial profile
          profile = await base44.entities.UserProfile.create({
            user_id: u.id,
            plan_id: "trial",
            trial_start_date: new Date().toISOString().split("T")[0],
          });
        }

        const planId = profile.plan_id || "trial";
        setPlan(planId);

        if (planId === "trial") {
          const startDate = profile.trial_start_date
            ? new Date(profile.trial_start_date)
            : new Date(u.created_date);
          const diffDays = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(7 - diffDays);
        } else {
          setTrialDaysLeft(null);
        }
      } catch {
        setPlan("trial");
        setTrialDaysLeft(7);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const isStarter = plan === "starter";
  const isPro = plan === "pro";
  const isAgency = plan === "agency";
  const isTrial = plan === "trial";
  const hasProAccess = isPro || isAgency;
  const hasAgencyAccess = isAgency;

  return { plan, trialDaysLeft, isLoading, user, isStarter, isPro, isAgency, isTrial, hasProAccess, hasAgencyAccess };
}