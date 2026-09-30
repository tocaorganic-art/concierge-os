import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertTriangle, Check } from "lucide-react";
import { formatBRL } from "@/lib/formatBRL";

// Schema de extração (Fase 3) — pedido explicitamente pelo Tony com base no
// contrato real que ele usa ("Adenda Contractual": tabela Cliente/Check-in/
// Check-out, Estrutura e Itens Confirmados, Inversão e Condições de
// Pagamento, Depósito em Garantia, Página de Firmas). `alertas_contratuais`
// usa a MESMA forma de src/components/proposals/AlertasContratuais.jsx
// (tipo/titulo/descricao/valor_estimado) — antes disso, esses alertas só
// existiam digitados manualmente (ver auditoria no commit desta feature).
const SCHEMA_EXTRACAO = {
  type: "object",
  properties: {
    cliente_nome: { type: "string", description: "Nome do cliente/contratante conforme consta no contrato" },
    documento_identidade: { type: "string", description: "Número do documento de identidade/passaporte do cliente, se constar" },
    propriedade_destino: { type: "string", description: "Nome/endereço da propriedade ou destino do contrato" },
    checkin_data: { type: "string", format: "date", description: "Data de check-in (YYYY-MM-DD)" },
    checkin_hora: { type: "string", description: "Horário de check-in (HH:mm), se constar" },
    checkout_data: { type: "string", format: "date", description: "Data de check-out (YYYY-MM-DD)" },
    checkout_hora: { type: "string", description: "Horário de check-out (HH:mm), se constar" },
    valor_total: { type: "number", description: "Valor total do contrato" },
    parcelas: {
      type: "array",
      description: "Parcelas de pagamento — uma por data de vencimento distinta (ex: sinal na assinatura, 2º pagamento)",
      items: {
        type: "object",
        properties: {
          descricao: { type: "string" },
          valor: { type: "number" },
          data_vencimento: { type: "string", format: "date" },
        },
      },
    },
    deposito_garantia_valor: { type: "number", description: "Valor do depósito/caução em garantia" },
    deposito_garantia_condicao: { type: "string", description: "Quando é cobrado e quando é devolvido o depósito em garantia" },
    custos_extras: {
      type: "array",
      description: "Custos extras informados no contrato (limpeza final, água/energia, etc.), não incluídos no valor total",
      items: {
        type: "object",
        properties: {
          descricao: { type: "string" },
          valor: { type: "number" },
        },
      },
    },
    servicos_incluidos: { type: "string", description: "Lista dos serviços/itens incluídos no contrato, separados por vírgula" },
    data_assinatura: { type: "string", format: "date", description: "Data de assinatura do contrato (página de firmas)" },
    alertas_contratuais: {
      type: "array",
      description: "Alertas operacionais/financeiros derivados de cláusulas de risco do contrato — capacidade máxima, restrições de barulho/festas, condições de checkout, multa/rescisão, risco fiscal, autorização necessária de terceiros, etc. Um item por cláusula de risco relevante; vazio se não houver nenhuma.",
      items: {
        type: "object",
        properties: {
          tipo: { type: "string", description: "categoria curta: capacidade, barulho, checkout, multa, fiscal, autorizacao, outros" },
          titulo: { type: "string" },
          descricao: { type: "string" },
          valor_estimado: { type: "number", description: "valor em R$ associado ao risco (multa, taxa), se houver" },
        },
      },
    },
  },
};

function LinhaCampo({ label, valorAtual, valorNovo, formatar = (v) => v ?? "—", diferente }) {
  if (valorNovo === undefined || valorNovo === null || valorNovo === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground w-32 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-sm text-right">
        {diferente && valorAtual ? (
          <div>
            <p className="text-muted-foreground text-xs line-through">{formatar(valorAtual)}</p>
            <p className="text-primary font-medium">{formatar(valorNovo)}</p>
          </div>
        ) : (
          <p className="text-foreground">{formatar(valorNovo)}</p>
        )}
      </div>
    </div>
  );
}

export default function LeituraContratoModal({ open, onOpenChange, proposal, onConfirmed }) {
  const [status, setStatus] = useState("extraindo");
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [incluirAgenda, setIncluirAgenda] = useState(true);
  const [incluirAlertas, setIncluirAlertas] = useState(true);
  const queryClient = useQueryClient();

  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!open || !proposal?.contrato_assinado_url) return;
    let cancelado = false;
    setStatus("extraindo");
    setDados(null);
    setErro("");
    (async () => {
      try {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: proposal.contrato_assinado_url,
          json_schema: SCHEMA_EXTRACAO,
        });
        if (cancelado) return;
        setDados(extracted?.output || extracted || {});
        setStatus("pronto");
      } catch {
        if (cancelado) return;
        setErro("Não consegui ler o contrato automaticamente. Tente novamente ou preencha os campos manualmente.");
        setStatus("erro");
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proposal?.contrato_assinado_url, tentativa]);

  const aplicarMutation = useMutation({
    mutationFn: async () => {
      // proposal já vem mesclado com o form atual do diálogo pai (inclui a
      // URL recém-anexada, ainda não salva no banco quando a leitura dispara
      // automaticamente no upload) — sempre persiste ela junto, senão a
      // Proposta ficaria com contrato_dados_extraidos sem contrato_assinado_url.
      const updates = {
        contrato_assinado_url: proposal.contrato_assinado_url,
        contrato_dados_extraidos: { ...dados, lido_em: new Date().toISOString() },
      };

      if (dados.propriedade_destino && dados.propriedade_destino !== proposal.destino) {
        updates.destino = dados.propriedade_destino;
      }
      if (dados.checkin_data && dados.checkin_data !== proposal.data_chegada) {
        updates.data_chegada = dados.checkin_data;
      }
      if (dados.checkout_data && dados.checkout_data !== proposal.data_saida) {
        updates.data_saida = dados.checkout_data;
      }
      if (dados.valor_total && Number(dados.valor_total) !== Number(proposal.valor || 0)) {
        updates.valor = Number(dados.valor_total);
      }
      if (dados.servicos_incluidos && dados.servicos_incluidos !== proposal.servicos) {
        updates.servicos = dados.servicos_incluidos;
      }
      if (incluirAlertas && Array.isArray(dados.alertas_contratuais) && dados.alertas_contratuais.length > 0) {
        const existentes = proposal.alertas_contratuais || [];
        const titulosExistentes = new Set(existentes.map((a) => (a.titulo || "").trim().toLowerCase()));
        const novos = dados.alertas_contratuais.filter((a) => a.titulo && !titulosExistentes.has(a.titulo.trim().toLowerCase()));
        if (novos.length > 0) updates.alertas_contratuais = [...existentes, ...novos];
      }

      await base44.entities.Proposal.update(proposal.id, updates);

      if (incluirAgenda) {
        const tarefas = [];
        if (dados.checkin_data) {
          tarefas.push({
            titulo: `Check-in — ${proposal.client_nome}`,
            tipo: "operacao",
            data: dados.checkin_data,
            ...(dados.checkin_hora ? { horario: dados.checkin_hora } : {}),
            client_id: proposal.client_id,
            client_nome: proposal.client_nome,
            visivel_cliente: true,
            descricao: `Check-in conforme contrato assinado — ${dados.propriedade_destino || proposal.destino || ""}`,
          });
        }
        if (dados.checkout_data) {
          tarefas.push({
            titulo: `Check-out — ${proposal.client_nome}`,
            tipo: "operacao",
            data: dados.checkout_data,
            ...(dados.checkout_hora ? { horario: dados.checkout_hora } : {}),
            client_id: proposal.client_id,
            client_nome: proposal.client_nome,
            visivel_cliente: true,
            descricao: `Check-out conforme contrato assinado — ${dados.propriedade_destino || proposal.destino || ""}`,
          });
        }
        (dados.parcelas || []).forEach((p, i) => {
          if (!p.data_vencimento) return;
          tarefas.push({
            titulo: `Pagamento ${p.descricao || `parcela ${i + 1}`} — ${proposal.client_nome}`,
            tipo: "operacao",
            data: p.data_vencimento,
            client_id: proposal.client_id,
            client_nome: proposal.client_nome,
            visivel_cliente: false,
            descricao: `${p.descricao || "Parcela"}: ${formatBRL(p.valor || 0)} — lembrete gerado a partir do contrato assinado.`,
          });
        });
        if (tarefas.length > 0) await Promise.all(tarefas.map((t) => base44.entities.Task.create(t)));
      }

      return updates;
    },
    onSuccess: (updates) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      // Sincroniza o form do diálogo pai (ainda não salvo) com o que já foi
      // gravado direto no banco aqui — senão um "Salvar" manual depois
      // reverteria destino/datas/valor pro que estava antes da leitura.
      onConfirmed?.({
        contrato_assinado_url: updates.contrato_assinado_url,
        ...(updates.destino !== undefined ? { destino: updates.destino } : {}),
        ...(updates.data_chegada !== undefined ? { data_chegada: updates.data_chegada } : {}),
        ...(updates.data_saida !== undefined ? { data_saida: updates.data_saida } : {}),
        ...(updates.valor !== undefined ? { valor: updates.valor } : {}),
        ...(updates.servicos !== undefined ? { servicos: updates.servicos } : {}),
      });
      onOpenChange(false);
    },
    onError: () => {
      setErro("Não consegui salvar os dados confirmados. Tente novamente.");
    },
  });

  const n = (v) => (v || v === 0 ? formatBRL(v) : "—");
  const d = (v) => (v ? new Date(v + "T00:00:00").toLocaleDateString("pt-BR") : "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Leitura do contrato
          </DialogTitle>
        </DialogHeader>

        {status === "extraindo" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Lendo o contrato com IA...</p>
          </div>
        )}

        {status === "erro" && (
          <div className="py-6 text-center space-y-3">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto" />
            <p className="text-sm text-red-400">{erro}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setTentativa((n) => n + 1)}>
              Tentar de novo
            </Button>
          </div>
        )}

        {status === "pronto" && dados && (
          <div className="space-y-4">
            <p className="text-[11px] text-muted-foreground">
              Confira os dados lidos abaixo antes de confirmar. Valores riscados mostram o que já estava preenchido na proposta; nada é salvo até você clicar em "Confirmar e aplicar".
            </p>

            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <LinhaCampo label="Cliente (contrato)" valorNovo={dados.cliente_nome} />
              <LinhaCampo label="Documento" valorNovo={dados.documento_identidade} />
              <LinhaCampo label="Destino" valorAtual={proposal.destino} valorNovo={dados.propriedade_destino} diferente={dados.propriedade_destino !== proposal.destino} />
              <LinhaCampo label="Check-in" valorAtual={proposal.data_chegada} valorNovo={dados.checkin_data} formatar={d} diferente={dados.checkin_data !== proposal.data_chegada} />
              {dados.checkin_hora && <LinhaCampo label="Horário check-in" valorNovo={dados.checkin_hora} />}
              <LinhaCampo label="Check-out" valorAtual={proposal.data_saida} valorNovo={dados.checkout_data} formatar={d} diferente={dados.checkout_data !== proposal.data_saida} />
              {dados.checkout_hora && <LinhaCampo label="Horário check-out" valorNovo={dados.checkout_hora} />}
              <LinhaCampo label="Valor total" valorAtual={proposal.valor} valorNovo={dados.valor_total} formatar={n} diferente={Number(dados.valor_total) !== Number(proposal.valor || 0)} />
              <LinhaCampo label="Depósito garantia" valorNovo={dados.deposito_garantia_valor} formatar={n} />
              <LinhaCampo label="Condição do depósito" valorNovo={dados.deposito_garantia_condicao} />
              <LinhaCampo label="Serviços incluídos" valorAtual={proposal.servicos} valorNovo={dados.servicos_incluidos} diferente={dados.servicos_incluidos !== proposal.servicos} />
              <LinhaCampo label="Assinado em" valorNovo={dados.data_assinatura} formatar={d} />
            </div>

            {dados.parcelas?.length > 0 && (
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Parcelas de pagamento</p>
                <div className="space-y-1">
                  {dados.parcelas.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-secondary border border-border rounded-lg px-3 py-2">
                      <span className="text-foreground">{p.descricao || `Parcela ${i + 1}`} · {d(p.data_vencimento)}</span>
                      <span className="font-mono text-muted-foreground">{n(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dados.custos_extras?.length > 0 && (
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Custos extras informados</p>
                <div className="space-y-1">
                  {dados.custos_extras.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-secondary border border-border rounded-lg px-3 py-2">
                      <span className="text-foreground">{c.descricao}</span>
                      <span className="font-mono text-muted-foreground">{n(c.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dados.alertas_contratuais?.length > 0 && (
              <div>
                <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 cursor-pointer">
                  <input type="checkbox" checked={incluirAlertas} onChange={(e) => setIncluirAlertas(e.target.checked)} className="rounded border-border" />
                  Alertas do contrato encontrados ({dados.alertas_contratuais.length})
                </label>
                <div className="space-y-1">
                  {dados.alertas_contratuais.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-foreground">{a.titulo}</p>
                        {a.descricao && <p className="text-muted-foreground mt-0.5">{a.descricao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input type="checkbox" checked={incluirAgenda} onChange={(e) => setIncluirAgenda(e.target.checked)} className="rounded border-border" />
              Criar na Agenda: check-in, check-out e um lembrete por parcela
            </label>

            {erro && <p className="text-xs text-red-400">{erro}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="button" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" disabled={aplicarMutation.isPending} onClick={() => aplicarMutation.mutate()}>
                {aplicarMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirmar e aplicar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
