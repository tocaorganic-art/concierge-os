import React, { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import Sidebar from "./Sidebar";
import MobileTopbar from "./MobileTopbar";
import MobileDrawer from "./MobileDrawer";
import MobileBottomNav from "./MobileBottomNav";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import TutorialModal from "@/components/tutorial/TutorialModal";
import PwaInstallPopup from "@/components/PwaInstallPopup";
import GlobalSearch from "./GlobalSearch";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { isClient, isLoading: isLoadingProfile } = useUserProfile();

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

    }).catch(() => {});
  }, []);

  // Enquanto o perfil ainda está carregando, NÃO renderiza o <Outlet/> — evita que
  // a subpágina interna (Faturamento, Despesas, Clientes...) monte e dispare suas
  // queries antes de sabermos se este login é do tipo "cliente".
  if (isLoadingProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Login do tipo "cliente": nunca mostra o dashboard interno, só o Portal do Cliente.
  if (isClient) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
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
      <main className="md:ml-64 h-full overflow-y-auto overflow-x-hidden pt-14 md:pt-0 pb-16 md:pb-0">
        <div className="p-4 md:p-8">
          <GlobalSearch />
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

      {/* PWA install popup */}
      <PwaInstallPopup />
    </div>
  );
}