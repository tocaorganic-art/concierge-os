import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Paperclip, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

// Anexo de mensagem do chat — o arquivo vive em armazenamento privado
// (file_uri), então cada visualização pede uma URL assinada de curta
// duração (CreateFileSignedUrl) para abrir/baixar sem expor o arquivo.
export default function ChatAnexo({ anexoUrl }) {
  const { t } = useLanguage();
  const [url, setUrl] = useState(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    setUrl(null);
    setFalhou(false);
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: anexoUrl, expires_in: 300 })
      .then((res) => { if (vivo) setUrl(res?.signed_url || null); })
      .catch(() => { if (vivo) setFalhou(true); });
    return () => { vivo = false; };
  }, [anexoUrl]);

  if (falhou) {
    return <p className="mt-1 text-[11px] text-muted-foreground italic">{t("chat_attachment_unavailable")}</p>;
  }
  if (!url) {
    return <Loader2 className="mt-1 w-3 h-3 animate-spin text-muted-foreground" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
    >
      <Paperclip className="w-3 h-3" /> {t("chat_view_attachment")}
    </a>
  );
}