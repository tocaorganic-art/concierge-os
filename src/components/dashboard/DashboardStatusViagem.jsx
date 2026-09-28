import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Plane } from "lucide-react";

const ETAPAS = ["Proposta", "Confirmado", "50% pago", "Check-in", "Concluído"];
const FRASES = [
  "A próxima história começa a ganhar forma.",
  "Destino confirmado. Pode começar a contagem.",
  "Metade do caminho — muitas histórias pela frente.",
  "Está quase na hora de partir.",
  "Mais uma viagem para guardar na memória.",
];
// Slogan oficial da Toca (usado na chegada da viagem).
const SLOGAN = "A gente cuida do caminho. Você vive a viagem.";

function etapaAtualIndex({ proposta, pctPago }) {
  if (!proposta) return 0;
  if (proposta.status === "concluido") return 4;
  const hoje = new Date();
  const chegada = proposta.data_chegada ? new Date(proposta.data_chegada) : null;
  if (chegada && hoje >= chegada) return 3;
  if (pctPago >= 50) return 2;
  if (proposta.status === "confirmado") return 1;
  return 0;
}

const posPct = (i) => (i / (ETAPAS.length - 1)) * 100;

// "Status da viagem" — mesma etapa/lógica de antes (etapaAtualIndex), só que
// com uma rota animada: o trecho já percorrido acende em laranja, um avião
// avança uma vez até a etapa atual (sem loop) e a frase da etapa entra com
// fade + subida leve. prefers-reduced-motion mostra tudo estático.
export default function DashboardStatusViagem({ proposta, pctPago }) {
  const atual = etapaAtualIndex({ proposta, pctPago });
  const reduzir = useReducedMotion();
  const diasParaChegada = proposta?.data_chegada
    ? Math.ceil((new Date(proposta.data_chegada) - new Date()) / 86400000)
    : null;
  const perto = diasParaChegada !== null && diasParaChegada >= 0 && diasParaChegada <= 7 && atual < 4;
  const concluido = atual === 4;
  const aviaoDe = Math.max(atual - 1, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">Status da viagem</h3>
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
              initial={{ left: `${posPct(aviaoDe)}%` }}
              animate={{ left: `${posPct(atual)}%` }}
              transition={reduzir ? { duration: 0 } : { duration: 1.4, ease: "easeInOut", delay: 0.3 }}
            >
              <motion.div
                initial={false}
                animate={
                  reduzir
                    ? { rotate: concluido ? 60 : 45 }
                    : concluido
                      ? { rotate: [45, 60], y: [0, 3], scale: [1, 0.92] }
                      : { rotate: 45 }
                }
                transition={concluido && !reduzir ? { delay: 1.9, duration: 0.5 } : { duration: 0 }}
              >
                <Plane
                  className={`w-4 h-4 text-primary drop-shadow-[0_0_6px_rgba(217,89,26,0.55)] ${concluido ? "opacity-90" : ""}`}
                />
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
                      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                        done
                          ? "bg-primary border-primary"
                          : isAtual
                            ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(217,89,26,0.35)]"
                            : "border-border bg-secondary"
                      }`}
                    >
                      {done ? (
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      ) : (
                        <span className={`text-[10px] font-mono ${isAtual ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
                      )}
                    </div>
                    {/* Pulso breve ao chegar na etapa atual (ou brilho no Check-in quando a viagem está próxima) */}
                    {(isAtual || (perto && i === 3)) && !reduzir && (
                      <motion.div
                        aria-hidden
                        className="absolute inset-0 rounded-full border-2 border-primary"
                        initial={{ opacity: 0.7, scale: 1 }}
                        animate={{ opacity: 0, scale: 2.1 }}
                        transition={{ delay: isAtual ? 1.8 : 1.2, duration: 0.9, repeat: 2, repeatDelay: 0.3 }}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[9px] md:text-[10px] font-mono uppercase tracking-wider text-center max-w-[64px] ${
                      isAtual ? "text-primary font-semibold" : done ? "text-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < ETAPAS.length - 1 && (
                  <div className="relative flex-1 h-0.5 mb-4 bg-border rounded overflow-hidden">
                    {i < atual - 1 && <div className="absolute inset-0 bg-primary/90" />}
                    {i === atual - 1 && (
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-primary/90"
                        initial={{ width: reduzir ? "100%" : "0%" }}
                        animate={{ width: "100%" }}
                        transition={reduzir ? { duration: 0 } : { duration: 1.4, ease: "easeInOut", delay: 0.3 }}
                      />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className={`text-center ${concluido ? "mt-3" : "mt-4"} min-h-[36px]`}>
        <AnimatePresence mode="wait">
          <motion.p
            key={atual}
            initial={reduzir ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzir ? undefined : { opacity: 0, y: -4 }}
            transition={reduzir ? { duration: 0 } : { delay: 1.9, duration: 0.5 }}
            className="text-sm italic text-foreground/80"
          >
            {FRASES[atual]}
          </motion.p>
        </AnimatePresence>
        {concluido && (
          <motion.p
            initial={reduzir ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduzir ? { duration: 0 } : { delay: 2.4, duration: 0.6 }}
            className="font-display italic text-primary mt-1.5 text-sm"
          >
            “{SLOGAN}”
          </motion.p>
        )}
      </div>
    </div>
  );
}