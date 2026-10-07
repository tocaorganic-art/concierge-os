import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ShieldOff, Eye, X } from "lucide-react";
import { useUserProfile } from "@/lib/useUserProfile";
import { ViewAsClientProvider, useEffectiveRole } from "@/lib/ViewAsClientContext";
import Sidebar from "./Sidebar";
import MobileTopbar from "./MobileTopbar";
import MobileDrawer from "./MobileDrawer";
import MobileBottomNav from "./MobileBottomNav";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import ConviteNecessario from "@/components/auth/ConviteNecessario";
import { deveMostrarOnboardingOperador } from "@/lib/papel";
import TutorialModal from "@/components/tutorial/TutorialModal";
import ClientTour from "@/components/client/ClientTour";
import PwaInstallPopup from "@/components/PwaInstallPopup";
import GlobalSearch from "./GlobalSearch";
import FloatingChat from "@/components/chat/FloatingChat";

// Rotas que uma conta "cliente" pode acessar dentro do MESMO dashboard do
// admin — o cliente vê só os próprios dados (regra de acesso no backend,
// ver base44/entities/*.jsonc), nunca os dados de outro cliente nem as
// áreas internas do Tony. Qualquer rota fora desta lista mostra "Sem
// Acesso" em vez de piscar o conteúdo interno antes de redirecionar.
const CLIENT_ALLOWED_PATHS = [
  "/dashboard",
  "/faturamento",
  "/agenda",
  "/relatorios",
  "/solicitacoes",
  "/meu-grupo",
  "/meu-contrato",
  "/documentos",
  "/meu-perfil",
  "/chat",
  "/toca-tria",
];

function SemAcesso() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <ShieldOff className="w-10 h-10 text-muted-foreground mb-4" />
      <p className="font-heading text-lg font-bold text-foreground mb-1">Sem acesso</p>
      <p className="text-sm text-muted-foreground">Esta área não está disponível para a sua conta.</p>
    </div>
  );
}

export default function AppLayout() {
  return (
    <ViewAsClientProvider>
      <AppLayoutInner />
    </ViewAsClientProvider>
  );
}

function AppLayoutInner() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showClientTour, setShowClientTour] = useState(false);
  const { user, isClient, isAdmin, profile, isLoading: isLoadingProfile } = useUserProfile();
  const { isClientMode, isImpersonating, viewingClientNome, stopViewAs } = useEffectiveRole();
  const location = useLocation();

  // Decide onboarding/tour só DEPOIS que o papel foi resolvido (useUserProfile já
  // espera o vínculo do convite). Antes isto lia um auth.me() próprio, em
  // paralelo, ainda sem o vínculo — o cliente recém-convidado caía no assistente
  // de configuração de operador (criar cliente/proposta) em vez do Portal.
  useEffect(() => {
    if (isLoadingProfile || !user) return;

    // Onboarding de operação: só para quem opera o Toca OS (admin/equipe).
    // Conta cliente não tem permissão de criar Client/Proposal (RLS).
    if (deveMostrarOnboardingOperador({ user, isClient })) {
      setShowOnboarding(true);
      return; // tutorial abre depois, quando o onboarding fechar (ver onComplete abaixo)
    }

    if (isClient) {
      // Tour guiado do Portal do Cliente: abre só no primeiro acesso; a flag
      // onboarding_concluido é gravada ao concluir/pular.
      if (user.onboarding_concluido !== true) setShowClientTour(true);
    } else if (user.id && !localStorage.getItem(`tutorial_seen_${user.id}`)) {
      setShowTutorial(true);
    }
  }, [isLoadingProfile, user?.id, isClient]);

  // Reabertura manual do tour do cliente: a página Perfil dispara este
  // evento no botão "Ver tour novamente".
  useEffect(() => {
    const abrirTour = () => setShowClientTour(true);
    window.addEventListener("toca:abrir-tour-cliente", abrirTour);
    return () => window.removeEventListener("toca:abrir-tour-cliente", abrirTour);
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

  // Login do tipo "cliente" (real ou "ver como cliente" do admin): mesmo
  // dashboard (mesmo design, mesmas páginas), mas só as rotas da whitelist —
  // os dados dentro delas já vêm filtrados pelo backend (RLS) para uma
  // conta cliente real; isto aqui só evita que uma URL interna pisque
  // conteúdo de área que não é dele antes de bloquear.
  const clientBlocked = isClientMode && !CLIENT_ALLOWED_PATHS.includes(location.pathname);

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
          {isImpersonating && (
            <div className="flex items-center justify-between gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 mb-4 text-xs">
              <span className="flex items-center gap-1.5 text-primary">
                <Eye className="w-3.5 h-3.5" /> Vendo como: {viewingClientNome || "cliente"} (somente leitura)
              </span>
              <button onClick={stopViewAs} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" /> Sair
              </button>
            </div>
          )}
          <GlobalSearch />
          {clientBlocked ? <SemAcesso /> : <Outlet />}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Chat flutuante cliente↔equipe — fixo em todas as páginas */}
      <FloatingChat />

      {/* Onboarding wizard */}
      {showOnboarding && user && (
        <OnboardingWizard
          user={user}
          onComplete={() => {
            setShowOnboarding(false);
            if (user?.id && !localStorage.getItem(`tutorial_seen_${user.id}`)) setShowTutorial(true);
          }}
        />
      )}

      {/* Tour guiado do cliente (primeiro acesso) */}
      {showClientTour && (
        <ClientTour onFinish={() => setShowClientTour(false)} />
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