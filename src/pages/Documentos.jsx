import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import { FolderOpen, FileText, Loader2, ExternalLink, Receipt, PenLine } from "lucide-react";
import ChatAnexo from "@/components/chat/ChatAnexo";
import { formatBRL } from "@/lib/formatBRL";
import { useLanguage } from "@/lib/i18n";

function DocLinha({ nome, sub, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors"
    >
      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{nome}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

// Centralização de documentos do cliente: contrato assinado e documentos da
// proposta, comprovantes financeiros (cobranças) e anexos do Chat — cada
// seção lê a própria fonte (mesma RLS), sem duplicar arquivos. O
// Proposal.documentos_admin fica admin-only e nunca chega aqui mesmo que o
// componente tentasse ler. Nunca contrato de fornecedor.
export default function Documentos() {
  const { t } = useLanguage();
  const { effectiveClientId } = useEffectiveRole();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["my_proposals", effectiveClientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: effectiveClientId }, "-created_date", 5),
    enabled: Boolean(effectiveClientId),
  });

  // Comprovantes financeiros — histórico de cada cobrança (RLS filtra para
  // cliente real; client_id explícito cobre o modo "ver como cliente").
  const { data: billings = [], isLoading: isLoadingBillings } = useQuery({
    queryKey: ["documentos_billings", effectiveClientId],
    queryFn: () => base44.entities.Billing.filter({ client_id: effectiveClientId }, "-created_date", 100),
    enabled: Boolean(effectiveClientId),
  });

  // Anexos enviados no Chat — o mesmo registro Comentario é a fonte (mesma RLS).
  const { data: comentarios = [] } = useQuery({
    queryKey: ["chat_anexos", effectiveClientId],
    queryFn: () => base44.entities.Comentario.filter({ client_id: effectiveClientId, escopo: "geral" }, "-created_date", 100),
    enabled: Boolean(effectiveClientId),
  });
  const anexosChat = comentarios.filter((c) => c.anexo_url);

  const contrato = proposals.find((p) => p.contrato_assinado_url)?.contrato_assinado_url;
  const documentosProposta = proposals.flatMap((p) => p.documentos_cliente || []);
  const comprovantes = billings.flatMap((b) =>
    (b.comprovantes || []).map((c, i) => ({
      ...c,
      id: `${b.id}-${i}`,
      billing_nome: b.descricao || b.client_nome,
      billing_valor: b.valor,
    }))
  );

  if (isLoading || isLoadingBillings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const vazio = !contrato && documentosProposta.length === 0 && comprovantes.length === 0 && anexosChat.length === 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="w-5 h-5 text-primary" />
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("docs_title")}</h1>
      </div>

      {vazio && (
        <p className="text-sm text-muted-foreground text-center py-12">{t("docs_empty")}</p>
      )}

      {(contrato || documentosProposta.length > 0) && (
        <div className="mb-8">
          <p className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
            <PenLine className="w-3.5 h-3.5" /> {t("docs_section_contrato")}
          </p>
          <div className="space-y-2">
            {contrato && (
              <DocLinha
                nome={t("docs_signed_contract")}
                sub={t("docs_signed_contract_sub")}
                href={contrato}
              />
            )}
            {documentosProposta.map((doc, i) => (
              <DocLinha
                key={i}
                nome={doc.nome}
                sub={doc.categoria}
                href={doc.url}
              />
            ))}
          </div>
        </div>
      )}

      {comprovantes.length > 0 && (
        <div className="mb-8">
          <p className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
            <Receipt className="w-3.5 h-3.5" /> {t("docs_section_comprovantes")}
          </p>
          <div className="space-y-2">
            {comprovantes.map((c) => (
              <div key={c.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.billing_nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("docs_comprovante_label")} · {c.enviado_em ? new Date(c.enviado_em).toLocaleDateString("pt-BR") : new Date(c.created_date || Date.now()).toLocaleDateString("pt-BR")}
                    {c.enviado_por && ` · enviado por ${c.enviado_por}`}
                    {c.billing_valor != null && ` · ${formatBRL(c.billing_valor)}`}
                  </p>
                </div>
                <DocLink url={c.url} />
              </div>
            ))}
          </div>
        </div>
      )}

      {anexosChat.length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">{t("docs_section_chat")}</p>
          <div className="space-y-2">
            {anexosChat.map((c) => (
              <div key={c.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.texto?.trim() || t("docs_chat_attachment_fallback")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("docs_chat_date_label")} · {new Date(c.created_date).toLocaleDateString("pt-BR")}</p>
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

function DocLink({ url }) {
  const { t } = useLanguage();
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={t("docs_open_title")} className="flex-shrink-0">
      <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
    </a>
  );
}