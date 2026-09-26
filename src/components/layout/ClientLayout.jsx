import React, { useEffect, useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { LogOut } from "lucide-react";

// Layout enxuto para quem acessa como "cliente" — sem o menu interno
// (pipeline, propostas, despesas, faturamento etc.), só o Portal do Cliente.
export default function ClientLayout() {
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    base44.auth.me()
      .then((u) => setFirstName(u?.full_name?.split(" ")[0] || ""))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/6a1f06cb2529a2c8784acc2c/64f555f0a_Toca_Icon_3D_Luxury_v2.png"
              alt="Toca OS"
              className="w-7 h-7 rounded-md object-cover"
            />
            <span className="font-display text-sm font-bold text-foreground">Toca <span className="text-primary">Concierge</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {firstName && (
              <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                {firstName}
              </span>
            )}
            <Link
              to="/meu-perfil"
              className="text-xs font-mono uppercase tracking-wider text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              Meu Perfil
            </Link>
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
      <Outlet />
    </div>
  );
}