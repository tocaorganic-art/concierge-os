import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import { useLanguage } from "@/lib/i18n";
import { LogOut, Home, Wallet, MessageSquare, UserRound } from "lucide-react";

// Layout enxuto para quem acessa como "cliente" — sem o menu interno
// (pipeline, propostas, despesas, faturamento etc.), só o Portal do Cliente.
//
// Estrutura de 4 abas (padrão de client portal de mercado: HoneyBook, Dubsado,
// concierges de luxo como Velocity Black/Quintessentially) — cada área do
// portal vive na sua própria tela, em vez de tudo empilhado numa página só:
// Início (ação rápida), Financeiro (pagamentos/saldo/comprovantes),
// Pedidos (histórico de solicitações ao concierge), Perfil (preferências).
const TABS = [
  { key: "inicio", icon: Home, path: "/portal", label: "Início" },
  { key: "financeiro", icon: Wallet, path: "/portal/financeiro", label: "Financeiro" },
  { key: "pedidos", icon: MessageSquare, path: "/portal/pedidos", label: "Pedidos" },
  { key: "perfil", icon: UserRound, path: "/meu-perfil", label: "Perfil" },
];

export default function ClientLayout() {
  const [firstName, setFirstName] = useState("");
  const location = useLocation();
  const { user } = useUserProfile();
  const { setLang } = useLanguage();

  useEffect(() => {
    base44.auth.me()
      .then((u) => setFirstName(u?.full_name?.split(" ")[0] || ""))
      .catch(() => {});
  }, []);

  // Idioma padrão por cliente (ex.: grupo argentino em espanhol) — só aplica
  // uma vez, na primeira visita sem preferência salva; depois disso o
  // usuário já escolheu manualmente e isso nunca sobrescreve de novo.
  useEffect(() => {
    if (!user?.client_id) return;
    if (localStorage.getItem("concierge_lang")) return;
    base44.entities.Client.filter({ id: user.client_id }, "-created_date", 1)
      .then((rows) => {
        const idioma = rows?.[0]?.idioma_padrao;
        if (idioma) setLang(idioma);
      })
      .catch(() => {});
  }, [user?.client_id, setLang]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2 min-w-0 shrink">
            <img
              src="https://media.base44.com/images/public/6a1f06cb2529a2c8784acc2c/64f555f0a_Toca_Icon_3D_Luxury_v2.png"
              alt="Toca OS"
              className="w-7 h-7 rounded-md object-cover shrink-0"
            />
            <span className="font-display text-sm font-bold text-foreground truncate">Toca <span className="text-primary">Concierge</span></span>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            {firstName && (
              <span className="text-sm text-muted-foreground truncate max-w-[80px]">
                {firstName}
              </span>
            )}
            <button
              onClick={() => base44.auth.logout()}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="pb-20">
        <Outlet />
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border flex max-w-lg mx-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {TABS.map(({ key, icon: Icon, path, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={key}
              to={path}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors min-h-[56px] ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}