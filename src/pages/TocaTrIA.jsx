import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, Loader2, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateWithAI } from "@/functions/generateWithAI";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";

const SUGGESTIONS = [
  "Como aumentar minha taxa de conversão de leads?",
  "Escreva uma proposta para viagem de lua de mel em Paris",
  "Quais perguntas fazer na primeira reunião com um cliente VIP?",
  "Como estruturar um follow-up após 7 dias sem resposta?",
  "Dicas para fechar mais propostas de alto valor",
];

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

export default function TocaTrIA() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Olá! Sou a Toca TrIA ✦\n\nSou sua assistente de IA especializada em concierge e turismo de luxo. Posso ajudar com propostas, estratégias de vendas, follow-up de clientes, gestão de agenda e muito mais.\n\nComo posso te ajudar hoje?",
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

    const res = await generateWithAI({
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
      content: "Chat reiniciado ✦\n\nComo posso te ajudar?",
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
            <h1 className="font-heading text-xl font-bold text-foreground">Toca TrIA</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Assistente IA · Concierge OS
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={clearChat} title="Limpar conversa">
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
              <span className="text-sm text-muted-foreground">Pensando...</span>
            </div>
          </div>
        )}

        {/* Suggestions (only when 1 message) */}
        {messages.length === 1 && !loading && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground pl-11">Sugestões para começar:</p>
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
            placeholder="Pergunte qualquer coisa sobre concierge, propostas, clientes..."
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
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  );
}