import React, { createContext, useContext, useState } from "react";
import { useUserProfile } from "@/lib/useUserProfile";

// Permite ao admin navegar o dashboard "como" um cliente específico, sem
// trocar de conta — só leitura, nunca ativa nenhuma permissão de escrita
// extra (o admin já podia ler tudo via RLS; isto só filtra a UI e some com
// os botões de admin). Guardado em memória (Context), não persiste entre
// reloads de propósito — é uma visualização pontual, não um modo de sessão.
const ViewAsClientContext = createContext(null);

export function ViewAsClientProvider({ children }) {
  const [viewingClientId, setViewingClientId] = useState(null);
  const [viewingClientNome, setViewingClientNome] = useState("");
  return (
    <ViewAsClientContext.Provider value={{ viewingClientId, viewingClientNome, setViewingClientId, setViewingClientNome }}>
      {children}
    </ViewAsClientContext.Provider>
  );
}

export function useViewAsClient() {
  const ctx = useContext(ViewAsClientContext);
  if (!ctx) throw new Error("useViewAsClient must be used within ViewAsClientProvider");
  return ctx;
}

// Combina o papel real (conta cliente de verdade) com o modo "ver como
// cliente" do admin — toda tela que se comporta diferente por papel deve
// usar isto em vez de useUserProfile().isClient direto.
export function useEffectiveRole() {
  const { isClient, user } = useUserProfile();
  const { viewingClientId, viewingClientNome, setViewingClientId, setViewingClientNome } = useViewAsClient();
  const isImpersonating = !isClient && Boolean(viewingClientId);
  return {
    isClientMode: isClient || isImpersonating,
    isRealClient: isClient,
    isImpersonating,
    effectiveClientId: isClient ? user?.client_id : viewingClientId,
    viewingClientNome,
    startViewAs: (clientId, nome) => { setViewingClientId(clientId); setViewingClientNome(nome || ""); },
    stopViewAs: () => { setViewingClientId(null); setViewingClientNome(""); },
  };
}
