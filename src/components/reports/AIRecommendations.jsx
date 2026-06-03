import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, TrendingUp, AlertCircle, Lightbulb, RefreshCw } from "lucide-react";
import { generateWithAI } from "@/functions/generateWithAI";

const typeConfig = {
  urgente: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  oportunidade: { icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  melhoria: { icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
};

const AiBadge = () => (
  <span className="inline-flex items-center gap-1 bg-primary/15 text-primary text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-primary/20 ml-2">✦ IA</span>
);

export default function AIRecommendations({ proposals, clients, tasks }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateWithAI({
      type: "ai_suggestions",
      payload: { proposals, clients, tasks: tasks || [] },
    });
    setLoading(false);
    const result = res?.data?.result;
    if (result?.recomendacoes) setRecommendations(result.recomendacoes);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center">
          Recomendações <AiBadge />
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : recommendations ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
          {loading ? "Analisando..." : recommendations ? "Atualizar" : "Gerar Insights"}
        </Button>
      </div>

      {!recommendations && !loading && (
        <div className="text-center py-8">
          <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Clique em "Gerar Insights" para obter recomendações personalizadas baseadas nos seus dados</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Analisando seu pipeline...</p>
        </div>
      )}

      {recommendations && (
        <div className="space-y-3">
          {recommendations.map((rec, i) => {
            const config = typeConfig[rec.tipo] || typeConfig.melhoria;
            const Icon = config.icon;
            return (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg}`}>
                <Icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className={`text-sm font-semibold ${config.color}`}>{rec.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.descricao}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}