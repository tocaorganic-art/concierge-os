import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Sidebar from "./Sidebar";
import MobileTopbar from "./MobileTopbar";
import MobileDrawer from "./MobileDrawer";
import MobileBottomNav from "./MobileBottomNav";
import TrialBanner from "./TrialBanner";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import TutorialModal from "@/components/tutorial/TutorialModal";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      if (!u) return;
      setUser(u);

      // Onboarding
      if (u.first_login !== false) setShowOnboarding(true);

      // Tutorial — show automatically if not seen yet (after onboarding)
      const tutorialSeen = localStorage.getItem(`tutorial_seen_${u.id}`);
      if (!tutorialSeen && u.first_login === false) {
        setTimeout(() => setShowTutorial(true), 800);
      }

      // Load plan from UserProfile
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
        let profile = profiles?.[0];
        if (!profile) {
          profile = await base44.entities.UserProfile.create({
            user_id: u.id,
            plan_id: "trial",
            trial_start_date: new Date().toISOString().split("T")[0],
          });
        }
        const planId = profile.plan_id || "trial";
        if (planId === "trial") {
          const startDate = profile.trial_start_date
            ? new Date(profile.trial_start_date)
            : new Date(u.created_date);
          const diffDays = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(7 - diffDays);
        }
      } catch {
        // fallback to created_date
        const createdAt = new Date(u.created_date);
        const diffDays = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));
        setTrialDaysLeft(Math.max(0, 7 - diffDays));
      }
    }).catch(() => {});
  }, []);

  const showBanner = !bannerDismissed && trialDaysLeft !== null;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar onOpenTutorial={() => setShowTutorial(true)} />
      </div>

      {/* Mobile topbar + drawer */}
      <div className="md:hidden">
        <MobileTopbar onMenuOpen={() => setDrawerOpen(true)} />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>

      {/* Main content */}
      <main className="md:ml-64 min-h-screen pt-14 md:pt-0 pb-16 md:pb-0">
        {showBanner && (
          <TrialBanner
            daysLeft={trialDaysLeft}
            onDismiss={trialDaysLeft > 0 ? () => setBannerDismissed(true) : null}
          />
        )}
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Onboarding wizard */}
      {showOnboarding && user && (
        <OnboardingWizard
          user={user}
          onComplete={() => {
            setShowOnboarding(false);
            // Show tutorial after onboarding completes for the first time
            const tutorialSeen = user?.id ? localStorage.getItem(`tutorial_seen_${user.id}`) : null;
            if (!tutorialSeen) {
              setTimeout(() => setShowTutorial(true), 500);
            }
          }}
        />
      )}

      {/* Tutorial modal */}
      <TutorialModal
        open={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          if (user?.id) localStorage.setItem(`tutorial_seen_${user.id}`, "1");
        }}
      />
    </div>
  );
}