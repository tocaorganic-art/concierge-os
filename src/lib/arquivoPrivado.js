import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Comprovantes e documentos de cliente ficam em armazenamento PRIVADO.
// No banco guardamos a referencia privada (file_uri); para abrir, pedimos
// uma URL assinada de curta duracao. Registros antigos ainda guardam uma URL
// publica (http/https): essas continuam abrindo direto, sem assinatura.

const VALIDADE_SEGUNDOS = 300;

export function ehArquivoPrivado(ref) {
  return Boolean(ref) && typeof ref === "string" && !/^(https?:|data:|blob:)/i.test(ref);
}

// Envia o arquivo para o armazenamento privado e devolve a referencia a gravar.
export async function enviarArquivoPrivado(file) {
  const res = await base44.integrations.Core.UploadPrivateFile({ file });
  if (!res?.file_uri) throw new Error("Falha no envio do arquivo.");
  return res.file_uri;
}

// URL utilizavel agora (assinada se for privada, a propria URL se for legado).
export async function urlDoArquivo(ref, validade = VALIDADE_SEGUNDOS) {
  if (!ref) return null;
  if (!ehArquivoPrivado(ref)) return ref;
  const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: ref, expires_in: validade });
  return res?.signed_url || null;
}

// Hook para <img>/<iframe>: resolve a URL assinada quando a referencia muda.
export function useUrlDoArquivo(ref) {
  const [url, setUrl] = useState(ehArquivoPrivado(ref) ? null : ref || null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let vivo = true;
    setErro(false);
    if (!ehArquivoPrivado(ref)) {
      setUrl(ref || null);
      return undefined;
    }
    setUrl(null);
    urlDoArquivo(ref)
      .then((u) => { if (vivo) { setUrl(u); if (!u) setErro(true); } })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [ref]);
  return { url, erro, carregando: ehArquivoPrivado(ref) && !url && !erro };
}

// Abre o arquivo em nova aba. A aba e aberta na hora do clique (antes da
// assinatura) para o navegador nao bloquear como pop-up.
export async function abrirArquivo(ref) {
  if (!ref) return;
  if (!ehArquivoPrivado(ref)) {
    window.open(ref, "_blank", "noopener,noreferrer");
    return;
  }
  const aba = window.open("", "_blank");
  try {
    const url = await urlDoArquivo(ref);
    if (!url) throw new Error("sem url");
    if (aba) {
      aba.opener = null;
      aba.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch {
    if (aba) aba.close();
    window.alert("Nao foi possivel abrir o arquivo agora. Tente de novo em instantes.");
  }
}

// href seguro para o <a>: arquivo privado nao tem URL fixa, entao o link
// aponta para "#" e o clique resolve a URL assinada.
export function hrefArquivo(ref) {
  return ehArquivoPrivado(ref) ? "#" : ref || "#";
}

// Handler pronto para <a href={ref} onClick={onClickArquivo(ref)}>: mantem o
// link normal para URL publica e assina na hora para arquivo privado.
export function onClickArquivo(ref, extra) {
  return (ev) => {
    if (extra) extra(ev);
    if (!ehArquivoPrivado(ref)) return;
    ev.preventDefault();
    abrirArquivo(ref);
  };
}
