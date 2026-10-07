import React from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

// Bloqueio de acesso para quem não tem convite: conta autenticada na
// plataforma, mas sem UserProfile (nem vinculado, nem convite pendente)
// e sem papel de admin. Só quem foi convidado pela equipe entra no Toca OS.
export default function ConviteNecessario() {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <KeyRound className="w-7 h-7 text-primary" />
      </div>
      <p className="font-heading text-lg font-bold text-foreground mb-2">Acesso apenas por convite</p>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        O Toca OS é exclusivo para clientes e equipe convidados.
        Se você deveria ter acesso, fale com o seu concierge para receber o convite.
      </p>
      <Button variant="outline" onClick={() => logout("/login")}>
        Sair da conta
      </Button>
    </div>
  );
}