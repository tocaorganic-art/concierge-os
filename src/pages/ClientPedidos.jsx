import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RequestHistory from "@/components/concierge/RequestHistory";
import { Loader2 } from "lucide-react";

// Aba Pedidos do Portal do Cliente — histórico de solicitações feitas ao
// concierge (antes vivia empilhado na Home; agora tem tela própria, ver
// ClientLayout.jsx para a navegação por abas).
export default function ClientPedidos() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my_requests"],
    queryFn: () => base44.entities.ServiceRequest.list("-created_date", 50),
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="font-heading text-xl font-bold text-foreground mb-4">Meus Pedidos</h1>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : requests.length > 0 ? (
        <RequestHistory requests={requests} />
      ) : (
        <p className="text-center text-sm text-muted-foreground py-12">
          Nenhum pedido ainda — use os atalhos na tela Início para pedir algo ao seu concierge.
        </p>
      )}
    </div>
  );
}
