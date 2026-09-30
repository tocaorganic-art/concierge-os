import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, User, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import BuscaIA from "@/components/client/BuscaIA";

function getSuggestions(t) {
  return [
    t("tria_suggestion_1"),
    t("tria_suggestion_2"),
    t("tria_suggestion_3"),
    t("tria_suggestion_4"),
    t("tria_suggestion_5"),
  ];
}

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isUser ? "bg-primary/20" : "bg-primary/10 border border-primary/20"}`}>
        {isUser ? <User className="w-4 h-4 text-primary" /> : <Sparkles className="w-4 h-4 text-primary" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border text-foreground rounded-tl-sm"}`}>
        {msg.content}
      </div>
    </div>
  );
}

// Portal do Cliente: mesma marca "Toca TrIA", mas outra IA por trás —
// BuscaIA já é escopada por client_id (RLS: só os próprios dados), nunca
// o chat administrativo geral de baixo (que fala do NEGÓCIO do Tony, não
// faz sentido nem é seguro mostrar pro cliente). Existia pronta desde a
// Fase 3b, só nunca tinha sido plugada em nenhuma tela.
function TocaTrIACliente({ clientId }) {
  const { t } = useLanguage();
  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-80px)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">{t("nav_tria_cliente")}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            {t("client_ai_hint")}
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-card border border-border rounded-xl p-4">
        <BuscaIA clientId={clientId} />
      </div>
    </div>
  );
}

function TocaTrIAAdmin() {
  const { t } = useLanguage();
  const SUGGESTIONS = getSuggestions(t);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: t("tria_welcome_message"),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (u) setUserContext(`Nome: ${u.full_name || ""}, Email: ${u.email || ""}`);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput("");

    const userMsg = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    const res = await base44.functions.invoke("generateWithAI", {
      type: "chat",
      payload: {
        messages: newMessages,
        user_context: userContext,
      },
    });

    setMessages([...newMessages, { role: "assistant", content: res.data.result }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: t("tria_cleared_message"),
    }]);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">{t("tria_title")}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {t("tria_subtitle")}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={clearChat} title={t("tria_clear_title")}>
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">{t("common_thinking")}</span>
            </div>
          </div>
        )}

        {/* Suggestions (only when 1 message) */}
        {messages.length === 1 && !loading && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground pl-11">{t("tria_suggestions_label")}</p>
            <div className="flex flex-wrap gap-2 pl-11">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs bg-card border border-border hover:border-primary/30 text-foreground/70 hover:text-foreground px-3 py-1.5 rounded-full transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-border">
        <div className="flex gap-2 items-end bg-card border border-border rounded-xl p-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("tria_input_placeholder")}
            className="flex-1 min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none text-sm p-1"
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="h-9 w-9 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">{t("tria_keyboard_hint")}</p>
      </div>
    </div>
  );
}

export default function TocaTrIA() {
  const { isClientMode, effectiveClientId } = useEffectiveRole();
  if (isClientMode) return <TocaTrIACliente clientId={effectiveClientId} />;
  return <TocaTrIAAdmin />;
}