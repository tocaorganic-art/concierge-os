import React from "react";
import { Toaster } from "@/components/ui/toaster";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/lib/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Pipeline from "@/pages/Pipeline";
import Clients from "@/pages/Clients";
import Agenda from "@/pages/Agenda";
import Proposals from "@/pages/Proposals";
import Reports from "@/pages/Reports";
import Billing from "@/pages/Billing";
import Despesas from "@/pages/Despesas";
import Settings from "@/pages/Settings";
import TocaTrIA from "@/pages/TocaTrIA";
import Solicitacoes from "@/pages/Solicitacoes";
import Parceiros from "@/pages/Parceiros";
import ConciergeKPIs from "@/pages/ConciergeKPIs";
import ClientProfile from "@/pages/ClientProfile";
import MeuGrupo from "@/pages/MeuGrupo";
import MeuContrato from "@/pages/MeuContrato";
import Chat from "@/pages/Chat";
import Documentos from "@/pages/Documentos";
import Obrigado from "@/pages/Obrigado";
import OAuthConsent from "@/pages/OAuthConsent";
import Connect from "@/pages/Connect";
import InstitucionalSection from "@/pages/InstitucionalSection";


const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Side effect fora do render: chamar navigateToLogin() no meio do render
  // dispara redirecionamentos repetidos durante os re-renders do boot.
  React.useEffect(() => {
    if (authError?.type === "auth_required") navigateToLogin();
  }, [authError, navigateToLogin]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      // O redirect ao login acontece no useEffect acima (uma vez só).
      return null;
    }
  }

  return (
    <Routes>
      {/* Consentimento OAuth do servidor MCP — fora de qualquer guarda de auth,
          a própria página redireciona ao login quando não autenticada. */}
      {/* Site institucional estático (public/institucional/index.html),
          sempre público para qualquer visitante, logado ou não. Cada item
          do menu tem sua própria rota real (URL muda de verdade ao navegar,
          sobrevive a reload/compartilhamento/voltar-avançar do navegador) —
          ver pages/InstitucionalSection.jsx para como isso funciona (iframe
          de tela cheia + "?page=N" + window.__institucionalNavigate).
          NAO reintroduzir aqui um redirect condicional por estado de
          autenticacao: ja foi tentado (commits "Redirecionar raiz para
          dashboard ou login..." em 2026-10-08) e causava a raiz abrir ora o
          site, ora o dashboard, pois o check de auth e assincrono. O acesso
          ao dashboard para quem ja e cliente e pelos links "Acessar o
          painel" do proprio site, que apontam direto para /dashboard
          (protegido por ProtectedRoute: sem sessao, cai em /login). */}
      <Route path="/" element={<InstitucionalSection pageIndex={0} title="Toca Concierge" />} />
      <Route path="/institucional" element={<InstitucionalSection pageIndex={0} title="Toca Concierge" />} />
      <Route path="/Curadoria" element={<InstitucionalSection pageIndex={1} title="Toca Concierge — Curadoria" />} />
      <Route path="/Sobre" element={<InstitucionalSection pageIndex={2} title="Toca Concierge — Sobre" />} />
      <Route path="/Nossas-Experiencias" element={<InstitucionalSection pageIndex={3} title="Toca Concierge — Nossas Experiências" />} />
      <Route path="/Nosso-Publico" element={<InstitucionalSection pageIndex={4} title="Toca Concierge — Nosso Público" />} />
      <Route path="/Proposta" element={<InstitucionalSection pageIndex={5} title="Toca Concierge — Proposta" />} />
      <Route path="/Reservar" element={<InstitucionalSection pageIndex={6} title="Toca Concierge — Reservar" />} />
      <Route path="/FAQ" element={<InstitucionalSection pageIndex={7} title="Toca Concierge — FAQ" />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />
      <Route path="/obrigado" element={<Obrigado />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/propostas" element={<Proposals />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/faturamento" element={<Billing />} />
          <Route path="/despesas" element={<Despesas />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/toca-tria" element={<TocaTrIA />} />
          <Route path="/solicitacoes" element={<Solicitacoes />} />
          <Route path="/parceiros" element={<Parceiros />} />
          <Route path="/kpis" element={<ConciergeKPIs />} />
          <Route path="/meu-grupo" element={<MeuGrupo />} />
          <Route path="/meu-contrato" element={<MeuContrato />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/meu-perfil" element={<ClientProfile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/connect" element={<Connect />} />
        </Route>
        {/* /planos mostrava planos de um produto diferente (consumidor final,
            Essencial/Premium/Black) com checkout do Stripe apontando pra
            outro app Base44 — sobra de template, nunca foi o sistema de
            planos real deste app (usePlan.js já libera tudo sem trava).
            Redireciona pra Configurações em vez de manter a rota acessível
            e clicável. Decisão de negócio pendente antes de reativar. */}
        <Route path="/planos" element={<Navigate to="/configuracoes" replace />} />
        {/* Portal antigo removido — rotas antigas caem na Visão Geral
            (/dashboard), que já se adapta por papel (admin/cliente). */}
        <Route path="/portal" element={<Navigate to="/dashboard" replace />} />
        <Route path="/portal/financeiro" element={<Navigate to="/faturamento" replace />} />
        <Route path="/portal/pedidos" element={<Navigate to="/solicitacoes" replace />} />
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        <Route path="/inicio" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;