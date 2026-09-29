import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Pencil, Paperclip, X } from "lucide-react";
import { useUserProfile } from "@/lib/useUserProfile";
import ChatAnexo from "@/components/chat/ChatAnexo";

const EDITAVEL_MINUTOS = 5;

// Chat geral cliente↔equipe — mesma mecânica de ComentariosThread
// (src/components/billing/ClientBillingBlocks.jsx), só que sem billing_id:
// uma única thread por cliente (Comentario.escopo="geral"), acessível pelo
// widget flutuante e pela página /chat. RLS de Comentario já é por
// client_id, não por billing_id, então nenhuma regra de acesso nova foi
// necessária — só billing_id virou opcional no schema.
export default function ChatGeral({ clientId }) {
  const { user, isClient } = useUserProfile();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [anexo, setAnexo] = useState(null);
  const listRef = useRef(null);

  const { data: comentarios = [] } = useQuery({
    queryKey: ["chat_geral", clientId],
    queryFn: () => base44.entities.Comentario.filter({ client_id: clientId, escopo: "geral" }, "created_date", 200),
    enabled: Boolean(clientId),
  });

  React.useEffect(() => {
    const naoLidos = comentarios.filter((c) => !c.lido && c.autor_tipo === (isClient ? "equipe" : "cliente"));
    naoLidos.forEach((c) => base44.entities.Comentario.update(c.id, { lido: true }).catch(() => {}));
  }, [comentarios, isClient]);

  React.useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comentarios.length]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Comentario.create(data),
    onSuccess: () => {
      setTexto("");
      setAnexo(null);
      queryClient.invalidateQueries({ queryKey: ["chat_geral", clientId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comentario.update(id, data),
    onSuccess: () => {
      setEditandoId(null);
      queryClient.invalidateQueries({ queryKey: ["chat_geral", clientId] });
    },
  });

  const handleEnviar = async () => {
    if ((!texto.trim() && !anexo) || !clientId || createMutation.isPending) return;
    let anexoUrl = null;
    if (anexo) {
      const res = await base44.integrations.Core.UploadPrivateFile({ file: anexo });
      anexoUrl = res?.file_uri || null;
    }
    createMutation.mutate({
      client_id: clientId,
      escopo: "geral",
      autor_tipo: isClient ? "cliente" : "equipe",
      autor_nome: user?.full_name || "",
      texto: texto.trim(),
      ...(anexoUrl ? { anexo_url: anexoUrl } : {}),
    });
  };

  const podeEditar = (c) => {
    if (c.created_by_id && user?.id && c.created_by_id !== user.id) return false;
    const minutos = (Date.now() - new Date(c.created_date).getTime()) / 60000;
    return minutos <= EDITAVEL_MINUTOS;
  };

  return (
    <div className="flex flex-col h-full font-heading">
      <div ref={listRef} className="flex-1 space-y-2 mb-2 overflow-y-auto pr-1 chat-scroll">
        {comentarios.map((c) => (
          <div key={c.id} className={`text-[12px] rounded-lg px-2.5 py-2 ${c.autor_tipo === "cliente" ? "bg-secondary/60" : "bg-primary/5"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">{c.autor_nome || (c.autor_tipo === "cliente" ? "Você" : "Equipe")}</span>
              <span className="text-muted-foreground">{new Date(c.created_date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {editandoId === c.id ? (
              <div className="mt-1 flex gap-1.5">
                <input
                  value={textoEdicao}
                  onChange={(e) => setTextoEdicao(e.target.value)}
                  className="flex-1 bg-background border border-border rounded px-2 py-1 text-[12px] font-heading"
                />
                <button onClick={() => updateMutation.mutate({ id: c.id, data: { texto: textoEdicao } })} className="text-primary text-[12px]">Salvar</button>
              </div>
            ) : (
              <p className="text-primary mt-0.5">{c.texto}</p>
            )}
            {c.anexo_url && <ChatAnexo anexoUrl={c.anexo_url} />}
            {podeEditar(c) && editandoId !== c.id && (
              <button
                onClick={() => { setEditandoId(c.id); setTextoEdicao(c.texto); }}
                className="mt-1 inline-flex items-center gap-1 text-muted-foreground hover:text-primary text-[11px]"
              >
                <Pencil className="w-2.5 h-2.5" /> editar
              </button>
            )}
          </div>
        ))}
        {comentarios.length === 0 && <p className="text-[12px] text-muted-foreground">Nenhuma mensagem ainda. Diga oi!</p>}
      </div>
      {anexo && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1 flex-shrink-0">
          <Paperclip className="w-3 h-3" /> {anexo.name}
          <button onClick={() => setAnexo(null)} className="hover:text-foreground" aria-label="Remover anexo">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex gap-1.5 flex-shrink-0">
        <label className="flex items-center flex-shrink-0 cursor-pointer text-primary hover:text-primary/80" title="Anexar arquivo">
          <Paperclip className="w-4 h-4" />
          <input type="file" className="hidden" onChange={(e) => setAnexo(e.target.files?.[0] || null)} />
        </label>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1 bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-[12px] font-heading"
          onKeyDown={(e) => { if (e.key === "Enter") handleEnviar(); }}
        />
        <button onClick={handleEnviar} disabled={createMutation.isPending} className="text-primary hover:text-primary/80 disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}