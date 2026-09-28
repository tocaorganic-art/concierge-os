import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, AlertCircle } from "lucide-react";
import { agruparBillingsCliente, saldoDevedor } from "@/lib/finance";

// Busca com IA sobre os PRÓPRIOS dados do cliente (item 10 do roadmap) —
// monta o contexto só com queries já filtradas por client_id (mesmo padrão
// de RLS usado em todo o resto do app: Dashboard, Faturamento, Meu Grupo
// etc.), nunca lê nada de outro cliente. A IA (generateWithAI
// "global_search") só pode responder com o que estiver nesse contexto.
export default function BuscaIA({ clientId }) {
  const [pergunta, setPergunta] = useState("");
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const { data: proposals = [] } = useQuery({
    queryKey: ["ia_search_proposals", clientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: clientId }, "-created_date", 5),
    enabled: Boolean(clientId),
  });
  const { data: billings = [] } = useQuery({
    queryKey: ["ia_search_billings", clientId],
    queryFn: () => base44.entities.Billing.filter({ client_id: clientId }, "-created_date", 200),
    enabled: Boolean(clientId),
  });
  const { data: recebimentos = [] } = useQuery({
    queryKey: ["ia_search_recebimentos", clientId],
    queryFn: () => base44.entities.Recebimento.filter({ client_id: clientId }, "-data_recebimento", 200),
    enabled: Boolean(clientId),
  });
  const { data: pedidos = [] } = useQuery({
    queryKey: ["ia_search_pedidos"],
    queryFn: () => base44.entities.ServiceRequest.list("-created_date", 50),
    enabled: Boolean(clientId),
  });
  const { data: hospedes = [] } = useQuery({
    queryKey: ["ia_search_hospedes", clientId],
    queryFn: () => base44.entities.Hospede.filter({ proposal_id: proposals?.[0]?.id }, "nome", 50),
    enabled: Boolean(proposals?.[0]?.id),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["ia_search_tasks", clientId],
    queryFn: () => base44.entities.Task.filter({ client_id: clientId }, "data", 50),
    enabled: Boolean(clientId),
  });

  const montarContexto = () => {
    const proposta = proposals?.[0];
    const { contrato, adicionais, caucao } = agruparBillingsCliente(billings);
    const linhas = [];

    linhas.push("== CONTRATO ==");
    if (proposta) {
      linhas.push(`Destino: ${proposta.destino || "—"}`);
      linhas.push(`Período: ${proposta.data_chegada || "—"} a ${proposta.data_saida || "—"}`);
      linhas.push(`Status: ${proposta.status || "—"}`);
      linhas.push(`Contrato assinado: ${proposta.contrato_assinado_url ? "sim" : "não"}`);
    } else {
      linhas.push("Nenhuma proposta/contrato encontrado.");
    }

    linhas.push("\n== FINANCEIRO / FATURAMENTO ==");
    [...contrato, ...adicionais, ...caucao].forEach((b) => {
      const saldo = Math.max(0, saldoDevedor(b, recebimentos));
      linhas.push(`- ${b.descricao || "Cobrança"}: R$ ${(b.valor || 0).toLocaleString("pt-BR")}, status ${b.status}, saldo em aberto R$ ${saldo.toLocaleString("pt-BR")}, vencimento ${b.data_vencimento || "—"}`);
    });

    linhas.push("\n== PEDIDOS ==");
    pedidos.slice(0, 20).forEach((p) => {
      linhas.push(`- [${p.tipo}] ${p.titulo} — status ${p.status}${p.resposta_concierge ? ` — resposta: ${p.resposta_concierge}` : ""}`);
    });

    linhas.push("\n== MEU GRUPO ==");
    hospedes.forEach((h) => {
      linhas.push(`- ${h.nome} ${h.sobrenome || ""}: chegada ${h.data_chegada || "—"} ${h.horario_chegada || ""} (${h.aerolinea_chegada || "—"}), saída ${h.data_saida || "—"} ${h.horario_saida || ""}, dorme em: ${h.pernoita_em || "—"}`);
    });

    linhas.push("\n== AGENDA ==");
    tasks.forEach((t) => {
      linhas.push(`- ${t.titulo || t.tipo || "Tarefa"} em ${t.data || "—"} ${t.horario || ""} — status ${t.status || "—"}`);
    });

    return linhas.join("\n");
  };

  const handlePerguntar = async (e) => {
    e.preventDefault();
    const texto = pergunta.trim();
    if (!texto || carregando) return;
    setPergunta("");
    setErro("");
    setCarregando(true);
    try {
      const contexto = montarContexto();
      const res = await base44.functions.invoke("generateWithAI", {
        type: "global_search",
        payload: { pergunta: texto, contexto },
      });
      setHistorico((h) => [...h, { pergunta: texto, resposta: res?.data?.result || "" }]);
    } catch {
      setErro("Não consegui responder agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-1 mb-2">
        {historico.length === 0 && (
          <p className="text-[12px] text-muted-foreground flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            Pergunte sobre seu contrato, financeiro, pedidos, grupo ou agenda — respondo com base nos seus dados reais.
          </p>
        )}
        <div className="space-y-3">
          {historico.map((h, i) => (
            <div key={i} className="text-[12px]">
              <p className="text-foreground font-medium">{h.pergunta}</p>
              <p className="text-muted-foreground mt-0.5">{h.resposta}</p>
            </div>
          ))}
        </div>
      </div>
      {erro && <p className="text-[11px] text-red-400 mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {erro}</p>}
      <form onSubmit={handlePerguntar} className="flex gap-1.5 flex-shrink-0">
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Ex: Quanto falta pagar?"
          disabled={carregando}
          className="flex-1 bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-[12px]"
        />
        <button type="submit" disabled={carregando || !pergunta.trim()} className="text-primary hover:text-primary/80 disabled:opacity-50">
          {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
