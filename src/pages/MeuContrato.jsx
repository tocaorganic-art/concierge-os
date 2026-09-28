import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useEffectiveRole } from "@/lib/ViewAsClientContext";
import { agruparBillingsCliente } from "@/lib/finance";
import { FileText, Loader2, Download, ExternalLink, Sparkles, Send, AlertCircle } from "lucide-react";

// Busca com IA sobre o contrato assinado — extrai o texto do PDF/imagem UMA
// vez por sessão (ExtractDataFromUploadedFile, mesmo padrão de leitura já
// usado em Faturamento/Pedidos) e reusa pra todas as perguntas seguintes, em
// vez de reler o arquivo a cada pergunta. A resposta é sempre baseada SÓ
// nesse texto (ver prompt em generateWithAI "contract_qa") — nunca inventa
// cláusula, e avisa quando não encontra a informação.
function BuscaContrato({ contratoUrl }) {
  const [pergunta, setPergunta] = useState("");
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [contratoTexto, setContratoTexto] = useState(null);

  const garantirTexto = async () => {
    if (contratoTexto) return contratoTexto;
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: contratoUrl,
      json_schema: {
        type: "object",
        properties: {
          texto_completo: { type: "string", description: "Todo o texto do documento, na íntegra, sem resumir nem traduzir." },
        },
      },
    });
    const texto = (extracted?.output || extracted || {}).texto_completo || "";
    setContratoTexto(texto);
    return texto;
  };

  const handlePerguntar = async (e) => {
    e.preventDefault();
    const texto = pergunta.trim();
    if (!texto || carregando) return;
    setPergunta("");
    setErro("");
    setCarregando(true);
    try {
      const contratoTextoAtual = await garantirTexto();
      if (!contratoTextoAtual) {
        setErro("Não consegui ler o texto do contrato. Tente novamente em instantes.");
        return;
      }
      const res = await base44.functions.invoke("generateWithAI", {
        type: "contract_qa",
        payload: { pergunta: texto, contrato_texto: contratoTextoAtual },
      });
      setHistorico((h) => [...h, { pergunta: texto, resposta: res?.data?.result || "" }]);
    } catch {
      setErro("Não consegui responder agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Pergunte sobre o contrato</p>
      </div>
      {historico.length > 0 && (
        <div className="space-y-3 mb-3">
          {historico.map((h, i) => (
            <div key={i} className="text-sm">
              <p className="text-foreground font-medium">{h.pergunta}</p>
              <p className="text-muted-foreground mt-0.5">{h.resposta}</p>
            </div>
          ))}
        </div>
      )}
      {erro && (
        <p className="text-xs text-red-400 mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {erro}</p>
      )}
      <form onSubmit={handlePerguntar} className="flex gap-2">
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Ex: Posso levar animal de estimação?"
          disabled={carregando}
          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" disabled={carregando || !pergunta.trim()} className="px-3 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
          {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}

// Meu Contrato — composição do preço cheio (itens_contrato, dado público do
// próprio contrato) + as parcelas de "Seu Contrato" (nunca a alocação
// interna de custo/margem por trás delas, essa é admin-only).
export default function MeuContrato() {
  const { effectiveClientId } = useEffectiveRole();

  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ["my_proposals", effectiveClientId],
    queryFn: () => base44.entities.Proposal.filter({ client_id: effectiveClientId }, "-created_date", 5),
    enabled: Boolean(effectiveClientId),
  });
  const proposta = proposals?.[0];

  const { data: billings = [], isLoading: loadingBillings } = useQuery({
    queryKey: ["my_billing", effectiveClientId],
    queryFn: () => base44.entities.Billing.filter({ client_id: effectiveClientId }, "numero_parcela", 50),
    enabled: Boolean(effectiveClientId),
  });

  if (loadingProposals || loadingBillings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { contrato } = agruparBillingsCliente(billings);
  const itens = proposta?.itens_contrato || [];
  const total = itens.reduce((sum, i) => sum + (i.incluido ? 0 : i.valor || 0), 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h1 className="font-heading text-2xl font-bold text-foreground">Meu Contrato</h1>
      </div>

      {proposta?.contrato_assinado_url && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Contrato assinado</p>
            <div className="flex items-center gap-3">
              <a href={proposta.contrato_assinado_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> Abrir
              </a>
              <a href={proposta.contrato_assinado_url} download className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Download className="w-3.5 h-3.5" /> Baixar
              </a>
            </div>
          </div>
          {proposta.contrato_assinado_url.toLowerCase().endsWith(".pdf") ? (
            <iframe src={proposta.contrato_assinado_url} title="Contrato assinado" className="w-full h-[70vh] rounded-lg border border-border" />
          ) : (
            <img src={proposta.contrato_assinado_url} alt="Contrato assinado" className="w-full rounded-lg border border-border" />
          )}
        </div>
      )}

      {proposta?.contrato_assinado_url && <BuscaContrato contratoUrl={proposta.contrato_assinado_url} />}

      {itens.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="space-y-2 mb-3">
            {itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{item.nome}</span>
                <span className={item.incluido ? "text-muted-foreground" : "font-mono text-foreground"}>
                  {item.incluido ? "Incluído" : `R$ ${(item.valor || 0).toLocaleString("pt-BR")}`}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-display font-bold text-lg text-primary">R$ {total.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      )}

      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Parcelas</p>
      <div className="space-y-2">
        {contrato.map((b) => (
          <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">
                {b.numero_parcela && b.total_parcelas ? `Parcela ${b.numero_parcela}/${b.total_parcelas}` : b.descricao}
              </p>
              <p className="text-[11px] text-muted-foreground">Venc. {b.data_vencimento ? new Date(b.data_vencimento).toLocaleDateString("pt-BR") : "—"}</p>
            </div>
            <span className="font-display font-semibold text-primary">R$ {(b.valor || 0).toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
