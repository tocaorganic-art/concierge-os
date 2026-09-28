import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, ChevronLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import ChatGeral from "@/components/client/ChatGeral";

// Página /chat — mesmo chat do widget flutuante (ChatGeral, thread
// Comentario.escopo="geral" por client_id). Cliente cai direto na própria
// conversa; admin/equipe escolhe com qual cliente falar (badge de não lidas
// por conversa). RLS de Comentario garante que cada usuário só vê as
// conversas autorizadas.
export default function Chat() {
  const { isClient } = useUserProfile();
  const { effectiveClientId } = useEffectiveRole();

  if (isClient) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <MessagesSquare className="w-5 h-5 text-primary" />
          <h1 className="font-heading text-2xl font-bold text-foreground">Chat</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 h-[70vh]">
          <ChatGeral clientId={effectiveClientId} />
        </div>
      </div>
    );
  }

  return <ChatAdmin />;
}

function ChatAdmin() {
  const [clientId, setClientId] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["chat-page-clientes"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  const { data: naoLidos = [] } = useQuery({
    queryKey: ["chat-page-nao-lidos"],
    queryFn: () => base44.entities.Comentario.filter({ escopo: "geral", lido: false, autor_tipo: "cliente" }, "-created_date", 200),
    refetchInterval: 30000,
  });

  if (clientId) {
    const cliente = clients.find((c) => c.id === clientId);
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setClientId(null)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="font-heading text-xl font-bold text-foreground truncate">{cliente?.nome || "Chat"}</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 h-[70vh]">
          <ChatGeral clientId={clientId} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <MessagesSquare className="w-5 h-5 text-primary" />
        <h1 className="font-heading text-2xl font-bold text-foreground">Chat</h1>
      </div>
      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => {
            const n = naoLidos.filter((m) => m.client_id === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setClientId(c.id)}
                className="w-full flex items-center justify-between gap-2 bg-card border border-border rounded-xl px-4 py-3.5 hover:bg-secondary/50 text-left transition-colors"
              >
                <span className="text-sm text-foreground truncate">{c.nome}</span>
                {n > 0 && (
                  <span className="flex-shrink-0 text-[10px] font-mono font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}