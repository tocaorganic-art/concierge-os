import {
  LayoutDashboard, Receipt, FileText, CalendarDays, BarChart3, Users, MessageSquare, FolderOpen, UserRound,
} from "lucide-react";

// Menu de uma conta "cliente" dentro do MESMO dashboard do admin (AppLayout) —
// só as páginas que fazem parte de src/components/layout/AppLayout.jsx
// CLIENT_ALLOWED_PATHS. Compartilhado entre Sidebar, MobileDrawer e
// MobileBottomNav para não duplicar (e desalinhar) a lista em 3 lugares.
export const CLIENT_NAV_ITEMS = [
  { key: "nav_overview", labelFallback: "Visão Geral", icon: LayoutDashboard, path: "/" },
  { key: "nav_billing", labelFallback: "Faturamento", icon: Receipt, path: "/faturamento" },
  { key: "nav_proposals", labelFallback: "Propostas", icon: FileText, path: "/propostas" },
  { key: "nav_schedule", labelFallback: "Agenda", icon: CalendarDays, path: "/agenda" },
  { key: "nav_meu_grupo", labelFallback: "Meu Grupo", icon: Users, path: "/meu-grupo" },
  { key: "nav_solicitacoes", labelFallback: "Pedidos", icon: MessageSquare, path: "/solicitacoes" },
  { key: "nav_documentos", labelFallback: "Documentos", icon: FolderOpen, path: "/documentos" },
  { key: "nav_reports", labelFallback: "Relatórios", icon: BarChart3, path: "/relatorios" },
  { key: "nav_perfil", labelFallback: "Perfil", icon: UserRound, path: "/meu-perfil" },
];
