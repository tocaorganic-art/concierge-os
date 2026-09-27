import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  MessageSquare,
  Calendar,
  User,
} from "lucide-react";
import { generateWithAI } from "@/functions/generateWithAI";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPOS = {
  experiencia: { label: "Experiência", emoji: "🏝️", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  reserva:     { label: "Reserva",     emoji: "🍽️", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  exclusivo:   { label: "Exclusivo",   emoji: "🚁", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  ajuda:       { label: "Urgente",     emoji: "🆘", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const STATUS = {
  novo:         { label: "Novo",         icon: Clock,        color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  em_andamento: { label: "Em andamento", icon: Sparkles,     color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  resolvido:    { label: "Resolvido",    icon: CheckCircle2, color: "bg-green-500/10 text-green-400 border-green-500/20" },
  cancelado:    { label: "Cancelado",    icon: XCircle,      color: "bg-muted text-muted-foreground border-border" },
};

function RequestCard({ req, onReply, onStatusChange }) {
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState(req.resposta_concierge || "");
  const [loadingAI, setLoadingAI] = useState(false);

  const tipo = TIPOS[req.tipo] || TIPOS.ajuda;
  const status = STATUS[req.status] || STATUS.novo;
  const StatusIcon = status.icon;

  const generateAIReply = async () => {
    setLoadingAI(true);
    const res = await generateWithAI({
      type: "chat",
      payload: {
        messages: [
          {
            role: "user",
            content: `Sou um concierge de luxo. Preciso responder esta solicitação de cliente de forma profissional e personalizada:\n\nTipo: ${tipo.label}\nSolicitação: ${req.titulo}\nDescrição: ${req.descricao || ""}\nDestino: ${req.destino || ""}\nData desejada: ${req.data_desejada || ""}\nPlano do cliente: ${req.plano_cliente || "premium"}\n\nEscreva uma resposta profissional, calorosa e que demonstre expertise em concierge de luxo.`,
          },
        ],
        user_context: "Concierge de luxo respondendo solicitação de cliente",
      },
    });
    setReply(res.data.result);
    setLoadingAI(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 gold-border-hover transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{tipo.emoji}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{req.titulo}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className={`text-[10px] font-mono ${tipo.color}`}>{tipo.label}</Badge>
              <Badge variant="outline" className={`text-[10px] font-mono ${status.color} flex items-center gap-1`}>
                <StatusIcon className="w-3 h-3" />{status.label}
              </Badge>
              {req.plano_cliente && (
                <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
                  {req.plano_cliente}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
          {req.created_date ? format(new Date(req.created_date), "dd MMM", { locale: ptBR }) : ""}
        </span>
      </div>

      {req.descricao && (
        <p className="text-sm text-muted-foreground mb-3 ml-9">{req.descricao}</p>
      )}

      <div className="flex items-center gap-4 ml-9 text-xs text-muted-foreground flex-wrap">
        {req.client_nome && (
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.client_nome}</span>
        )}
        {req.destino && (
          <span>📍 {req.destino}</span>
        )}
        {req.data_desejada && (
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(req.data_desejada), "dd/MM/yyyy")}</span>
        )}
      </div>

      {req.resposta_concierge && !showReply && (
        <div className="mt-3 ml-9 bg-secondary/50 rounded-xl p-3 text-xs text-foreground/70 border border-border">
          <span className="text-primary font-mono text-[10px] uppercase tracking-wider block mb-1">✦ Resposta enviada</span>
          {req.resposta_concierge}
        </div>
      )}

      <div className="mt-4 ml-9 flex items-center gap-2">
        {req.status === "novo" && (
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => onStatusChange(req, "em_andamento")}>
            <Sparkles className="w-3 h-3" /> Assumir
          </Button>
        )}
        {req.status === "em_andamento" && (
          <Button size="sm" variant="outline" className="text-xs gap-1.5 text-green-400 border-green-500/20 hover:bg-green-500/10" onClick={() => onStatusChange(req, "resolvido")}>
            <CheckCircle2 className="w-3 h-3" /> Resolver
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={() => setShowReply(!showReply)}>
          <MessageSquare className="w-3 h-3" /> Responder
        </Button>
      </div>

      {showReply && (
        <div className="mt-3 ml-9 space-y-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Escreva sua resposta para o cliente..."
            className="text-sm min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={generateAIReply} disabled={loadingAI}>
              {loadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
              Gerar com IA
            </Button>
            <Button size="sm" className="text-xs" onClick={() => { onReply(req, reply); setShowReply(false); }}>
              Salvar resposta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Solicitacoes() {
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["service_requests"],
    queryFn: () => base44.entities.ServiceRequest.list("-created_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceRequest.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_requests"] }),
  });

  const handleReply = (req, reply) => {
    updateMutation.mutate({ id: req.id, data: { resposta_concierge: reply, status: "em_andamento" } });
  };

  const handleStatusChange = (req, newStatus) => {
    updateMutation.mutate({ id: req.id, data: { status: newStatus } });
  };

  const filtered = requests.filter((r) => {
    const statusOk = filtroStatus === "todos" || r.status === filtroStatus;
    const tipoOk = filtroTipo === "todos" || r.tipo === filtroTipo;
    return statusOk && tipoOk;
  });

  const counts = {
    novo: requests.filter((r) => r.status === "novo").length,
    em_andamento: requests.filter((r) => r.status === "em_andamento").length,
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Solicitações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Pedidos dos seus clientes concierge</p>
        </div>
        <div className="flex items-center gap-2">
          {counts.novo > 0 && (
            <span className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 text-xs font-mono px-2.5 py-1 rounded-full">
              {counts.novo} novo{counts.novo > 1 ? "s" : ""}
            </span>
          )}
          {counts.em_andamento > 0 && (
            <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 text-xs font-mono px-2.5 py-1 rounded-full">
              {counts.em_andamento} em andamento
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 bg-secondary/50 border border-border rounded-xl p-1 overflow-x-auto">
          {["todos", "novo", "em_andamento", "resolvido"].map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filtroStatus === s ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "todos" ? "Todos" : STATUS[s]?.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-secondary/50 border border-border rounded-xl p-1">
          {["todos", "experiencia", "reserva", "exclusivo", "ajuda"].map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`px-2 py-1 rounded-lg text-xs transition-all ${filtroTipo === t ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "todos" ? "Todos" : TIPOS[t]?.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-4xl mb-3">🏝️</div>
          <p className="text-sm">Nenhuma solicitação encontrada</p>
          <p className="text-xs mt-1 opacity-60">Quando seus clientes fizerem pedidos, eles aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              onReply={handleReply}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}