import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, X, ChevronLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import ChatGeral from "@/components/client/ChatGeral";

// Evento global para abrir o chat de qualquer lugar (menu lateral, mobile
// drawer etc.) sem sair da página atual — o widget é fixo na tela durante
// a navegação inteira (montado no AppLayout).
export const OPEN_CHAT_EVENT = "toca:abrir-chat";
export const abrirChatFlutuante = () => window.dispatchEvent(new Event(OPEN_CHAT_EVENT));

export default function FloatingChat() {
  const { isClient } = useUserProfile();
  const { isImpersonating, effectiveClientId } = useEffectiveRole();
  const [aberto, setAberto] = useState(false);
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(OPEN_CHAT_EVENT, abrir);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, abrir);
  }, []);

  // "Ver como cliente" é somente leitura — não dispara conversa (o widget
  // nem renderiza, mas os hooks abaixo rodam sempre, na mesma ordem).
  const meuClientId = isClient ? effectiveClientId : null;

  const { data: naoLidos = [] } = useQuery({
    queryKey: ["chat-flutuante-nao-lidos", meuClientId],
    queryFn: () =>
      base44.entities.Comentario.filter(
        isClient
          ? { client_id: meuClientId, escopo: "geral", lido: false, autor_tipo: "equipe" }
          : { escopo: "geral", lido: false, autor_tipo: "cliente" },
        "-created_date", 200
      ),
    refetchInterval: 30000,
    enabled: !isImpersonating,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["chat-flutuante-clientes"],
    queryFn: () => base44.entities.Client.list("nome", 200),
    enabled: !isClient && !isImpersonating,
  });

  if (isImpersonating) return null;

  const totalNaoLidos = naoLidos.length;

  return (
    <>
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed z-40 right-4 bottom-24 md:bottom-6 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          {totalNaoLidos > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalNaoLidos}
            </span>
          )}
        </button>
      )}

      {aberto && (
        <div className="fixed z-40 right-4 bottom-24 md:bottom-6 md:right-6 w-[calc(100vw-2rem)] max-w-sm h-[min(70vh,480px)] bg-card border border-border rounded-2xl shadow-2xl gold-glow flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
            {clientId ? (
              <button
                onClick={() => setClientId(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : <span />}
            <p className="text-sm font-semibold text-foreground">Chat</p>
            <button
              onClick={() => setAberto(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Fechar chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!isClient && !clientId ? (
            <div className="flex-1 overflow-y-auto p-2">
              {clients.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum cliente cadastrado ainda.</p>
              ) : (
                clients.map((c) => {
                  const n = naoLidos.filter((m) => m.client_id === c.id).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setClientId(c.id)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg hover:bg-secondary/60 text-left transition-colors"
                    >
                      <span className="text-sm text-foreground truncate">{c.nome}</span>
                      {n > 0 && (
                        <span className="flex-shrink-0 text-[10px] font-mono font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                          {n}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 p-3">
              <ChatGeral clientId={clientId || meuClientId} />
            </div>
          )}
        </div>
      )}
    </>
  );
}