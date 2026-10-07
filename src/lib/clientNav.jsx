import {
  LayoutDashboard, Receipt, FileText, CalendarDays, BarChart3, Users, MessageSquare, FolderOpen, UserRound, Sparkles,
} from "lucide-react";

// Menu de uma conta "cliente" dentro do MESMO dashboard do admin (AppLayout) —
// só as páginas que fazem parte de src/components/layout/AppLayout.jsx
// CLIENT_ALLOWED_PATHS. Compartilhado entre Sidebar (desktop, lista única —
// mesmo padrão do admin), MobileDrawer (☰, lista completa) e
// MobileBottomNav (mobile, só os 4 principais — ver CLIENT_BOTTOM_NAV_PATHS).
export const CLIENT_NAV_ITEMS = [
  { key: "nav_overview", labelFallback: "Visão Geral", icon: LayoutDashboard, path: "/dashboard" },
  { key: "nav_billing_cliente", labelFallback: "Financeiro", icon: Receipt, path: "/faturamento" },
  { key: "nav_schedule", labelFallback: "Agenda", icon: CalendarDays, path: "/agenda" },
  { key: "nav_solicitacoes", labelFallback: "Pedidos", icon: MessageSquare, path: "/solicitacoes" },
  { key: "nav_meu_grupo", labelFallback: "Meu Grupo", icon: Users, path: "/meu-grupo" },
  { key: "nav_meu_contrato", labelFallback: "Meu Contrato", icon: FileText, path: "/meu-contrato" },
  { key: "nav_documentos", labelFallback: "Documentos", icon: FolderOpen, path: "/documentos" },
  { key: "nav_tria_cliente", labelFallback: "Toca TrIA", icon: Sparkles, path: "/toca-tria" },
  { key: "nav_reports", labelFallback: "Relatórios", icon: BarChart3, path: "/relatorios" },
  { key: "nav_perfil", labelFallback: "Perfil", icon: UserRound, path: "/meu-perfil" },
  { key: "nav_chat", labelFallback: "Chat", icon: MessageSquare, path: "/chat" },
];

// Barra inferior do celular: só os 4 principais, conforme especificado.
export const CLIENT_BOTTOM_NAV_PATHS = ["/dashboard", "/faturamento", "/agenda", "/solicitacoes"];