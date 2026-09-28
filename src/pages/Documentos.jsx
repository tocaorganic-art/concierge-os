import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import { FolderOpen, FileText, Loader2, ExternalLink } from "lucide-react";
import ChatAnexo from "@/components/chat/ChatAnexo";

// Documentos do cliente — só o que a proposta expõe em documentos_cliente
// (Proposal.documentos_admin fica com RLS de campo admin-only, nunca chega
// aqui mesmo que o componente tentasse ler). Nunca contrato de fornecedor.
export default function Documentos() {
  const { effectiveClientId } = useEffectiveRole();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["my_proposals", effectiveClientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: effectiveClientId }, "-created_date", 5),
    enabled: Boolean(effectiveClientId),
  });

  const documentos = proposals.flatMap((p) => p.documentos_cliente || []);

  // Anexos enviados no Chat — aparecem aqui com a origem identificada, sem
  // criar cópias: o mesmo registro Comentario é a fonte (mesma RLS).
  const { data: comentarios = [] } = useQuery({
    queryKey: ["chat_anexos", effectiveClientId],
    queryFn: () => base44.entities.Comentario.filter({ client_id: effectiveClientId, escopo: "geral" }, "-created_date", 100),
    enabled: Boolean(effectiveClientId),
  });
  const anexosChat = comentarios.filter((c) => c.anexo_url);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="w-5 h-5 text-primary" />
        <h1 className="font-heading text-2xl font-bold text-foreground">Documentos</h1>
      </div>

      {documentos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhum documento disponível ainda.</p>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc, i) => (
            <a
              key={i}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors"
            >
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{doc.nome}</p>
                {doc.categoria && <p className="text-[11px] text-muted-foreground">{doc.categoria}</p>}
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </a>
          ))}
        </div>
      )}

      {anexosChat.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Do Chat</p>
          <div className="space-y-2">
            {anexosChat.map((c) => (
              <div key={c.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.texto?.trim() || "Anexo da conversa"}</p>
                  <p className="text-[11px] text-muted-foreground">Chat · {new Date(c.created_date).toLocaleDateString("pt-BR")}</p>
                </div>
                <ChatAnexo anexoUrl={c.anexo_url} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}