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


const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/obrigado" element={<Obrigado />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
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
        </Route>
        {/* /planos mostrava planos de um produto diferente (consumidor final,
            Essencial/Premium/Black) com checkout do Stripe apontando pra
            outro app Base44 — sobra de template, nunca foi o sistema de
            planos real deste app (usePlan.js já libera tudo sem trava).
            Redireciona pra Configurações em vez de manter a rota acessível
            e clicável. Decisão de negócio pendente antes de reativar. */}
        <Route path="/planos" element={<Navigate to="/configuracoes" replace />} />
        {/* Portal antigo removido — rotas antigas caem na Visão Geral ("/"),
            que já se adapta por papel (admin/cliente). */}
        <Route path="/portal" element={<Navigate to="/" replace />} />
        <Route path="/portal/financeiro" element={<Navigate to="/faturamento" replace />} />
        <Route path="/portal/pedidos" element={<Navigate to="/solicitacoes" replace />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/inicio" element={<Navigate to="/" replace />} />
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