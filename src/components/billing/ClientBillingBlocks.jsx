import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip, Camera, ChevronDown, Send, Pencil } from "lucide-react";
import { statusDerivado } from "@/lib/finance";
import { useUserProfile } from "@/lib/useUserProfile";

const EDITAVEL_MINUTOS = 5;

// Blocos de UI usados pela Faturamento do cliente dentro do dashboard único
// (Billing.jsx) — extraído em componente próprio para reuso (LinhaParcela,
// AnexarComprovante, ComentariosThread).

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export const STATUS_LABEL = {
  pendente: { label: "Pendente", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  aguardando_confirmacao: { label: "Aguardando confirmação", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  parcialmente_recebido: { label: "Parcial", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  recebido: { label: "Pago", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  atrasado: { label: "Atrasado", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
};

// Permite ao cliente anexar seu próprio comprovante de pagamento a uma
// parcela pendente/parcial — só grava comprovante_url (RLS de campo em
// base44/entities/Billing.jsonc), nunca altera valor, status ou natureza.
export function AnexarComprovante({ billing, onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [divergencia, setDivergencia] = useState(null);

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setDivergencia(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Billing.update(billing.id, { comprovante_url: file_url, ultima_edicao_por: "cliente" });
      try {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: { type: "object", properties: { valor: { type: "number", description: "Valor total pago, conforme o comprovante" } } },
        });
        const data = extracted?.output || extracted || {};
        if (data.valor && billing.valor && Math.abs(data.valor - billing.valor) > 0.5) {
          setDivergencia({ lido: data.valor, esperado: billing.valor });
        }
      } catch {
        // sem problema, só não confere automaticamente
      }
      onUploaded();
    } catch {
      setError("Não consegui enviar. Tente novamente.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mt-0.5">
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={handleFileSelected} />
      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-60">
        {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />}
        {uploading ? "Lendo com IA..." : "Anexar comprovante de pagamento"}
      </button>
      {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      {divergencia && (
        <p className="text-[10px] text-amber-400 mt-0.5">
          O comprovante mostra R$ {divergencia.lido.toLocaleString("pt-BR")}, mas essa cobrança é de R$ {divergencia.esperado.toLocaleString("pt-BR")} — enviado mesmo assim, a equipe vai conferir.
        </p>
      )}
    </div>
  );
}

// Fio de conversa por cobrança — cliente e equipe/admin comentam na mesma
// linha (Comentario.billing_id). Editável por 5 minutos após criado,
// depois imutável (checado no cliente, não é uma trava de RLS).
function ComentariosThread({ billingId, clientId }) {
  const { user, isClient } = useUserProfile();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const listRef = useRef(null);

  const { data: comentarios = [] } = useQuery({
    queryKey: ["comentarios", billingId],
    queryFn: () => base44.entities.Comentario.filter({ billing_id: billingId }, "created_date", 100),
    enabled: Boolean(billingId),
  });

  // Ao abrir o fio, marca como lido tudo que veio "do outro lado" da
  // conversa — contador de não lidos (Sidebar/menu) some assim que a
  // pessoa efetivamente lê.
  React.useEffect(() => {
    const naoLidos = comentarios.filter((c) => !c.lido && c.autor_tipo === (isClient ? "equipe" : "cliente"));
    naoLidos.forEach((c) => base44.entities.Comentario.update(c.id, { lido: true }).catch(() => {}));
  }, [comentarios, isClient]);

  // Rola para a mensagem mais recente sempre que o fio muda — sem isso o
  // fio ficava "escondido" (sem indicação visual de que havia mais
  // mensagens acima do que cabia na área visível).
  React.useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comentarios.length]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Comentario.create(data),
    onSuccess: () => {
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["comentarios", billingId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comentario.update(id, data),
    onSuccess: () => {
      setEditandoId(null);
      queryClient.invalidateQueries({ queryKey: ["comentarios", billingId] });
    },
  });

  const handleEnviar = () => {
    if (!texto.trim()) return;
    createMutation.mutate({
      billing_id: billingId,
      client_id: clientId,
      autor_tipo: isClient ? "cliente" : "equipe",
      autor_nome: user?.full_name || "",
      texto: texto.trim(),
    });
  };

  const podeEditar = (c) => {
    if (c.created_by_id && user?.id && c.created_by_id !== user.id) return false;
    const minutos = (Date.now() - new Date(c.created_date).getTime()) / 60000;
    return minutos <= EDITAVEL_MINUTOS;
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Comentários</p>
      <div ref={listRef} className="space-y-2 mb-2 max-h-56 overflow-y-auto pr-1 chat-scroll">
        {comentarios.map((c) => (
          <div key={c.id} className={`text-[11px] rounded-lg px-2.5 py-2 ${c.autor_tipo === "cliente" ? "bg-secondary/60" : "bg-primary/5"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{c.autor_nome || (c.autor_tipo === "cliente" ? "Cliente" : "Equipe")}</span>
              <span className="text-muted-foreground">{new Date(c.created_date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {editandoId === c.id ? (
              <div className="mt-1 flex gap-1.5">
                <input
                  value={textoEdicao}
                  onChange={(e) => setTextoEdicao(e.target.value)}
                  className="flex-1 bg-background border border-border rounded px-2 py-1 text-[11px]"
                />
                <button onClick={() => updateMutation.mutate({ id: c.id, data: { texto: textoEdicao } })} className="text-primary text-[11px]">Salvar</button>
              </div>
            ) : (
              <p className="text-muted-foreground mt-0.5">{c.texto}</p>
            )}
            {podeEditar(c) && editandoId !== c.id && (
              <button
                onClick={() => { setEditandoId(c.id); setTextoEdicao(c.texto); }}
                className="mt-1 inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-2.5 h-2.5" /> editar
              </button>
            )}
          </div>
        ))}
        {comentarios.length === 0 && <p className="text-[11px] text-muted-foreground">Nenhum comentário ainda.</p>}
      </div>
      <div className="flex gap-1.5">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva um comentário..."
          className="flex-1 bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-[11px]"
          onKeyDown={(e) => { if (e.key === "Enter") handleEnviar(); }}
        />
        <button onClick={handleEnviar} disabled={createMutation.isPending} className="text-primary hover:text-primary/80 disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Uma linha de cobrança clicável — expande para mostrar o histórico de
// recebimentos e comprovantes daquela cobrança específica, mais um fio de
// comentários entre cliente e equipe.
export function LinhaParcela({ billing, recebimentos, onUploaded, defaultAberto = false }) {
  const [aberto, setAberto] = useState(defaultAberto);
  const recebimentosDaParcela = recebimentos.filter((r) => r.billing_id === billing.id);
  const status = statusDerivado(billing, recebimentos);
  const meta = STATUS_LABEL[status] || STATUS_LABEL.pendente;
  const podeAnexar = status !== "recebido" && status !== "cancelado" && !billing.comprovante_url;

  return (
    <div id={`billing-${billing.id}`} className="border-b border-border/60 last:border-0 py-2.5 scroll-mt-24">
      <button type="button" onClick={() => setAberto((a) => !a)} className="w-full flex items-start justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="text-sm text-foreground">
            {billing.numero_parcela && billing.total_parcelas ? `Parcela ${billing.numero_parcela}/${billing.total_parcelas}` : billing.descricao || "Cobrança"}
          </p>
          <p className="text-[11px] text-muted-foreground">Venc. {formatDate(billing.data_vencimento)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-display font-semibold text-primary">R$ {(billing.valor || 0).toLocaleString("pt-BR")}</span>
          <span className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${meta.className}`}>{meta.label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
        </div>
      </button>
      {aberto && (
        <div className="mt-2 pl-1 space-y-1.5">
          {recebimentosDaParcela.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum recebimento lançado ainda.</p>
          ) : (
            recebimentosDaParcela.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-[11px]">
                <span className={r.valor < 0 ? "text-red-400" : "text-muted-foreground"}>
                  {r.estorno_de_id ? "Estorno" : "Recebido"} em {formatDate(r.data_recebimento)}{r.metodo ? ` · ${r.metodo}` : ""}
                </span>
                <span className={r.valor < 0 ? "text-red-400 font-mono" : "text-emerald-400 font-mono"}>R$ {r.valor.toLocaleString("pt-BR")}</span>
              </div>
            ))
          )}
          {billing.comprovante_url && (
            <a href={billing.comprovante_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
              <Paperclip className="w-2.5 h-2.5" /> Ver comprovante
            </a>
          )}
          {podeAnexar && <AnexarComprovante billing={billing} onUploaded={onUploaded} />}
          <ComentariosThread billingId={billing.id} clientId={billing.client_id} />
        </div>
      )}
    </div>
  );
}
