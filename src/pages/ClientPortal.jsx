import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RequestModal from "@/components/concierge/RequestModal";
import RequestHistory from "@/components/concierge/RequestHistory";
import { Loader2, Crown } from "lucide-react";

const TIPOS = [
  {
    id: "experiencia",
    emoji: "🏝️",
    label: "Experiência",
    sub: "Roteiros, passeios e aventuras",
    color: "from-blue-600/20 to-blue-500/5 border-blue-500/20 hover:border-blue-400/50",
    glow: "hover:shadow-blue-500/10",
  },
  {
    id: "reserva",
    emoji: "🍽️",
    label: "Reservar",
    sub: "Restaurantes, hotéis, transfers",
    color: "from-amber-600/20 to-amber-500/5 border-amber-500/20 hover:border-amber-400/50",
    glow: "hover:shadow-amber-500/10",
  },
  {
    id: "exclusivo",
    emoji: "🚁",
    label: "Exclusivo",
    sub: "Yacht, helicóptero, chef privado",
    color: "from-purple-600/20 to-purple-500/5 border-purple-500/20 hover:border-purple-400/50",
    glow: "hover:shadow-purple-500/10",
  },
  {
    id: "ajuda",
    emoji: "🆘",
    label: "Preciso de ajuda",
    sub: "Suporte emergencial agora",
    color: "from-red-600/20 to-red-500/5 border-red-500/20 hover:border-red-400/50",
    glow: "hover:shadow-red-500/10",
  },
];

export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [selectedTipo, setSelectedTipo] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my_requests"],
    queryFn: () => base44.entities.ServiceRequest.list("-created_date", 20),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_requests"] });
      setSelectedTipo(null);
    },
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-20">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono px-3 py-1 rounded-full mb-4">
            <Crown className="w-3 h-3" /> Toca Concierge
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
            {greeting()}{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">Como posso ajudar você hoje?</p>
        </div>

        {/* 4 Action Tiles */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {TIPOS.map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => setSelectedTipo(tipo)}
              className={`relative bg-gradient-to-b ${tipo.color} border rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${tipo.glow} group`}
            >
              <span className="text-3xl block mb-3">{tipo.emoji}</span>
              <p className="font-semibold text-foreground text-sm">{tipo.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{tipo.sub}</p>
            </button>
          ))}
        </div>

        {/* History */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : requests.length > 0 ? (
          <RequestHistory requests={requests} />
        ) : null}
      </div>

      {/* Request Modal */}
      {selectedTipo && (
        <RequestModal
          tipo={selectedTipo}
          user={user}
          onClose={() => setSelectedTipo(null)}
          onSubmit={(data) => createMutation.mutate(data)}
          isSubmitting={createMutation.isPending}
        />
      )}
    </div>
  );
}