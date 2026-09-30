import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Check, Plane, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Jornada da viagem — 5 marcos 100% manuais (definidos pelo admin no painel).
// Nada aqui deriva etapa de datas, pagamentos ou tempo: é só visual.
export const ETAPAS = [
  "Proposta recebida",
  "Destino confirmado",
  "Preparativos",
  "Tudo pronto",
  "Viagem concluída",
];

// Rótulos curtos da linha do tempo (cabem lado a lado no mobile).
const ETAPAS_CURTAS = ["Proposta", "Destino", "Preparativos", "Tudo pronto", "Concluída"];

const MENSAGENS = [
  "Proposta recebida — vamos começar a planejar?",
  "Destino confirmado — agora a contagem regressiva fica ainda mais especial.",
  "Preparativos em andamento — estamos cuidando dos detalhes.",
  "Tudo pronto — sua viagem está chegando!",
  "Viagem concluída — esperamos que tenha sido inesquecível!",
];

// Slogan oficial da Toca (usado na chegada da viagem).
const SLOGAN = "A gente cuida do caminho. Você vive a viagem.";

const posPct = (i) => (i / (ETAPAS.length - 1)) * 100;

// Etapa atual vem SEMPRE do campo manual etapa_jornada. Registro antigo sem
// o campo começa em "Proposta recebida" (etapa 1) — nunca avança sozinho.
export function etapaDaJornada(proposta) {
  const n = Number(proposta?.etapa_jornada);
  return Number.isInteger(n) && n >= 1 && n <= ETAPAS.length ? n - 1 : 0;
}

// Controle do admin: seleciona / avança / volta o rascunho de etapa, mas
// nada muda até "Salvar" (confirmação explícita). O controle só é renderizado
// para role admin — o cliente nunca o vê; e a RLS da Proposal restringe o
// update no backend a admin/criador.
function ControleEtapaAdmin({ proposta, atual }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rascunho, setRascunho] = useState(atual + 1);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setRascunho(atual + 1), [atual]);

  const salvar = async () => {
    setSalvando(true);
    await base44.entities.Proposal.update(proposta.id, { etapa_jornada: rascunho });
    await queryClient.invalidateQueries({ queryKey: ["proposals"] });
    setSalvando(false);
    toast({ title: "Etapa atualizada", description: MENSAGENS[rascunho - 1] });
  };

  return (
    <div className="mt-5 pt-4 border-t border-border/60">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
        Painel do admin — definir etapa (o cliente vê só o resultado)
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline" size="icon" className="shrink-0"
          disabled={salvando || rascunho <= 1}
          onClick={() => setRascunho((r) => Math.max(1, r - 1))}
          aria-label="Voltar etapa"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Select value={String(rascunho)} onValueChange={(v) => setRascunho(Number(v))}>
          <SelectTrigger className="flex-1 min-w-0 bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ETAPAS.map((label, i) => (
              <SelectItem key={label} value={String(i + 1)}>{i + 1}. {label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline" size="icon" className="shrink-0"
          disabled={salvando || rascunho >= ETAPAS.length}
          onClick={() => setRascunho((r) => Math.min(ETAPAS.length, r + 1))}
          aria-label="Avançar etapa"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button size="sm" className="shrink-0" disabled={salvando || rascunho === atual + 1} onClick={salvar}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// "Jornada da viagem" — caminho com marcos em estilo carimbo de passaporte
// (concluídos) e um avião que, ao aparecer ou quando a etapa muda, percorre
// o caminho até o último marco e volta até a etapa atual, onde fica parado
// (ida e volta breves, sem loop). prefers-reduced-motion: avião parado na
// etapa atual, sem voo. A animação é apenas visual — nunca muda a etapa.
export default function DashboardStatusViagem({ proposta, podeEditar }) {
  const atual = etapaDaJornada(proposta);
  const reduzir = useReducedMotion();
  const diasParaChegada = proposta?.data_chegada
    ? Math.ceil((new Date(proposta.data_chegada + "T00:00:00") - new Date()) / 86400000)
    : null;
  const perto = diasParaChegada !== null && diasParaChegada >= 0 && diasParaChegada <= 7 && atual < 4;
  const concluido = atual === ETAPAS.length - 1;
  const fim = posPct(ETAPAS.length - 1);
  const voa = !reduzir && !concluido;
  const duracaoVoo = 2.4;

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">Jornada da viagem</h3>
        {diasParaChegada !== null && diasParaChegada >= 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {perto && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                Está chegando!
              </span>
            )}
            <span className="text-xs font-mono text-primary">
              Faltam {diasParaChegada} dia{diasParaChegada !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <div className="pt-7">
        {/* Avião — track alinhado aos centros dos marcadores (inset de meio círculo) */}
        <div className="relative h-0">
          <div className="absolute left-3 right-3 -top-5 h-4">
            <motion.div
              className="absolute -translate-x-1/2"
              initial={false}
              animate={
                voa
                  ? { left: [`${posPct(atual)}%`, `${fim}%`, `${posPct(atual)}%`] }
                  : { left: `${posPct(atual)}%` }
              }
              transition={
                voa
                  ? { duration: duracaoVoo, times: [0, 0.55, 1], ease: "easeInOut", delay: 0.4 }
                  : { duration: 0 }
              }
            >
              <motion.div
                initial={false}
                animate={
                  reduzir
                    ? { rotate: concluido ? 60 : 45 }
                    : voa
                      ? { rotate: [45, 45, -45, -45, 45], y: [0, -2, 0, -2, 0] }
                      : concluido
                        ? { rotate: 60, y: 3 }
                        : { rotate: 45 }
                }
                transition={
                  voa
                    ? { duration: duracaoVoo, times: [0, 0.5, 0.58, 0.95, 1], delay: 0.4 }
                    : concluido && !reduzir
                      ? { duration: 0.5, delay: 0.4 }
                      : { duration: 0 }
                }
              >
                <Plane className="w-4 h-4 text-primary drop-shadow-[0_0_6px_rgba(217,89,26,0.55)]" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="flex items-center">
          {ETAPAS.map((label, i) => {
            const done = i < atual;
            const isAtual = i === atual;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="relative">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                        done
                          ? // Marco concluído = carimbo de passaporte (tracejado, levemente girado, brilho sutil)
                            "border-dashed border-primary bg-primary/10 -rotate-6 shadow-[0_0_10px_rgba(217,89,26,0.3)]"
                          : isAtual
                            ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(217,89,26,0.35)]"
                            : "border-border bg-secondary"
                      }`}
                    >
                      {done ? (
                        <Check className="w-3 h-3 text-primary" />
                      ) : (
                        <span className={`text-[10px] font-mono ${isAtual ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
                      )}
                    </div>
                    {/* Pulso breve ao chegar na etapa atual (ou no "Tudo pronto" quando a viagem está próxima) */}
                    {(isAtual || (perto && i === 3)) && !reduzir && (
                      <motion.div
                        aria-hidden
                        className="absolute inset-0 rounded-full border-2 border-primary"
                        initial={{ opacity: 0.7, scale: 1 }}
                        animate={{ opacity: 0, scale: 2.1 }}
                        transition={{ delay: voa ? 3 : 0.6, duration: 0.9, repeat: 2, repeatDelay: 0.3 }}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[8px] md:text-[10px] font-mono uppercase tracking-wider text-center max-w-[58px] md:max-w-[64px] ${
                      isAtual ? "text-primary font-semibold" : done ? "text-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {ETAPAS_CURTAS[i]}
                  </span>
                </div>
                {i < ETAPAS.length - 1 && (
                  <div className="relative flex-1 h-0.5 mb-4 bg-border rounded overflow-hidden">
                    {i < atual && <div className="absolute inset-0 bg-primary/90" />}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className={`text-center ${concluido ? "mt-3" : "mt-4"} min-h-[52px]`}>
        <AnimatePresence mode="wait">
          <motion.p
            key={atual}
            initial={reduzir ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzir ? undefined : { opacity: 0, y: -4 }}
            transition={reduzir ? { duration: 0 } : { delay: voa ? 3 : 0.2, duration: 0.5 }}
            className="text-sm italic text-foreground/80"
          >
            {MENSAGENS[atual]}
          </motion.p>
        </AnimatePresence>
        {concluido && (
          <motion.p
            initial={reduzir ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduzir ? { duration: 0 } : { delay: 0.8, duration: 0.6 }}
            className="font-display italic text-primary mt-1.5 text-sm"
          >
            “{SLOGAN}”
          </motion.p>
        )}
      </div>

      {podeEditar && proposta && (
        <ControleEtapaAdmin proposta={proposta} atual={atual} />
      )}
    </div>
  );
}