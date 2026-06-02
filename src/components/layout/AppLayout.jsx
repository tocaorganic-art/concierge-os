import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Sidebar from "./Sidebar";
import MobileTopbar from "./MobileTopbar";
import MobileDrawer from "./MobileDrawer";
import TrialBanner from "./TrialBanner";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!u) return;
      setUser(u);

      // Onboarding: show if first_login is not explicitly false
      if (u.first_login !== false) {
        setShowOnboarding(true);
      }

      // Trial: based on account creation date
      const createdAt = new Date(u.created_date);
      const now = new Date();
      const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
      const daysLeft = 7 - diffDays;
      // Only show banner if within trial window and no plan assigned
      if (!u.plan && daysLeft >= 0) {
        setTrialDaysLeft(daysLeft);
      } else if (!u.plan && daysLeft < 0) {
        setTrialDaysLeft(0); // expired
      }
    }).catch(() => {});
  }, []);

  const showBanner = !bannerDismissed && trialDaysLeft !== null;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile topbar + drawer */}
      <div className="md:hidden">
        <MobileTopbar onMenuOpen={() => setDrawerOpen(true)} />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>

      {/* Main content */}
      <main className="md:ml-64 min-h-screen pt-14 md:pt-0">
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

      {/* Onboarding wizard */}
      {showOnboarding && user && (
        <OnboardingWizard
          user={user}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}