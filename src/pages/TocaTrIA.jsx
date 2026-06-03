import React from "react";
import { Sparkles, Brain, Calendar, FileText, BarChart3, MessageCircle, Zap, Star } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

const features = [
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    badge: "Agenda",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    items: [
      "\"Sugerir horário com IA\" analisa seus compromissos e encontra o melhor slot livre",
      "Lembretes automáticos: notificação 1h e 15min antes de cada tarefa",
      "Exportar qualquer tarefa diretamente para o Google Calendar com 1 clique",
      "Campo \"lembrar com antecedência\" (15min, 30min, 1h, 1 dia)",
    ],
  },
  {
    icon: FileText,
    title: "Propostas com IA",
    badge: "Propostas",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    items: [
      "\"Gerar com IA\" cria proposta completa com título, serviços e descrição personalizada",
      "Suporte a 6 tipos: Viagem de luxo, Casamento, Evento corporativo e mais",
      "Faça upload de proposta existente (PDF/DOCX) como referência de estilo",
      "Edite antes de salvar — a IA é um ponto de partida, você finaliza",
    ],
  },
  {
    icon: BarChart3,
    title: "Relatórios Avançados",
    badge: "Relatórios",
    color: "text-green-400",
    bg: "bg-green-500/10",
    items: [
      "Gráfico de funil: Lead → Proposta → Confirmado → Concluído com % de conversão",
      "Painel de recomendações: 3 insights acionáveis gerados pela IA com seus dados reais",
      "Receita acumulada com área chart + Top 5 clientes + distribuição por tipo",
      "Exportar relatório completo em PDF com todos os gráficos",
    ],
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Integrado",
    badge: "Clientes & Propostas",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    items: [
      "Botão WhatsApp em cada cliente abre conversa direta com mensagem pré-formatada",
      "\"Enviar via WhatsApp\" em propostas gera mensagem completa com todos os detalhes",
      "Tarefas do tipo Chamada: botão \"Iniciar WhatsApp\" para o cliente vinculado",
      "4 templates prontos + gerador livre de mensagens via IA",
    ],
  },
];

const AiBadge = () => (
  <span className="inline-flex items-center gap-1 bg-primary/15 text-primary text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-primary/20">
    ✦ IA
  </span>
);

export default function TocaTrIA() {
  return (
    <div className="max-w-4xl mx-auto pb-16">
      <PageHeader
        title="Toca TrIA"
        subtitle="Inteligência artificial integrada em todas as funcionalidades"
      />

      {/* Hero */}
      <div className="relative bg-card border border-primary/20 rounded-2xl p-8 mb-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Bem-vindo à Toca TrIA</h2>
              <p className="text-sm text-muted-foreground">Powered by Claude AI (Anthropic)</p>
            </div>
          </div>
          <p className="text-foreground/80 text-sm leading-relaxed max-w-2xl">
            A Toca TrIA é a evolução do Concierge OS — uma plataforma onde a inteligência artificial trabalha junto
            com você para automatizar tarefas repetitivas, gerar propostas profissionais e extrair insights do seu pipeline.
            Cada recurso marcado com <AiBadge /> usa IA real para tornar seu trabalho mais inteligente.
          </p>
        </div>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-lg ${f.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-foreground">{f.title}</h3>
                    <AiBadge />
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground">{f.badge}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {f.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/75">
                    <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="font-display text-lg font-bold text-foreground mb-5 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> Como funciona a IA
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "01", title: "Você fornece o contexto", desc: "Informe dados básicos como cliente, destino, tipo de serviço ou objetivo da mensagem." },
            { step: "02", title: "IA gera o conteúdo", desc: "Claude (Anthropic) processa seus dados e gera proposta, mensagem ou análise personalizada em segundos." },
            { step: "03", title: "Você revisa e usa", desc: "Todo conteúdo pode ser editado antes de salvar. A IA sugere, você decide." },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <span className="font-mono text-2xl font-bold text-primary/30">{s.step}</span>
              <div>
                <p className="font-semibold text-sm text-foreground mb-1">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Dicas para melhores resultados</p>
            <ul className="space-y-1.5">
              {[
                "Quanto mais detalhes você fornecer, mais personalizada será a resposta da IA",
                "Em propostas, use o campo de observações para informar preferências específicas do cliente",
                "No gerador de mensagens WhatsApp, descreva o contexto da conversa para mensagens mais precisas",
                "As recomendações de Relatórios são mais precisas com mais dados históricos no pipeline",
              ].map((tip) => (
                <li key={tip} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">✦</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}