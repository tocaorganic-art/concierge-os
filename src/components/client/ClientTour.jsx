import React, { useState, useEffect, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Tour guiado de primeiro acesso do Portal do Cliente (Bug 11). Passo a
// passo apontando para cada item do menu lateral, com botão "Pular" em
// todos os passos. Ao concluir OU pular, grava onboarding_concluido: true
// no perfil do usuário (updateMe) — o tour não reaparece sozinho depois;
// reabre só pelo botão "Ver tour novamente" na página Perfil.

const PASSOS = [
  { menu: "Visão Geral", texto: "Aqui você acompanha a sua viagem: status, próximos eventos e o resumo dos seus pagamentos." },
  { menu: "Financeiro", texto: "Todas as cobranças do seu contrato: parcelas, comprovantes e o chat com a nossa equipe sobre cada valor." },
  { menu: "Agenda", texto: "O roteiro da sua estadia: check-in, transfers e os eventos do dia a dia." },
  { menu: "Pedidos", texto: "Peça reservas, experiências, transfers ou qualquer ajuda direto para o seu concierge." },
  { menu: "Meu Grupo", texto: "Cadastre o grupo: dados de chegada, voos e documentos de cada hóspede." },
  { menu: "Meu Contrato", texto: "O contrato assinado e os valores combinados, sempre disponíveis para consulta." },
  { menu: "Documentos", texto: "Vouchers, contratos e arquivos da sua viagem em um só lugar." },
  { menu: "Toca TrIA", texto: "Sua assistente com IA, 24 horas: pergunte qualquer coisa sobre a sua viagem." },
  { menu: "Relatórios", texto: "Resumo financeiro da sua estadia, em números simples." },
  { menu: "Perfil", texto: "Suas preferências de viagem e consumo, para acertarmos cada detalhe." },
];

export default function ClientTour({ onFinish }) {
  const [passo, setPasso] = useState(0);
  const [rect, setRect] = useState(null);
  const [desktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);

  const finalizar = useCallback(() => {
    base44.auth.updateMe({ onboarding_concluido: true }).catch(() => {});
    onFinish();
  }, [onFinish]);

  // Localiza o item do menu do passo atual e mede o retângulo para o
  // destaque (spotlight). No mobile o menu lateral não existe — mostra
  // o card centralizado sem destaque.
  useEffect(() => {
    if (!desktop) { setRect(null); return undefined; }
    const alvo = PASSOS[passo];
    const links = [...document.querySelectorAll("a")];
    const el = links.find((a) => a.textContent.trim() === alvo.menu)
      || links.find((a) => a.textContent.trim().startsWith(alvo.menu));
    if (!el) { setRect(null); return undefined; }
    el.scrollIntoView({ block: "center" });
    const medir = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const t = setTimeout(medir, 350);
    window.addEventListener("resize", medir);
    return () => { clearTimeout(t); window.removeEventListener("resize", medir); };
  }, [passo, desktop]);

  const atual = PASSOS[passo];
  const ultimo = passo === PASSOS.length - 1;

  const conteudo = (centralizado) => (
    <div className={centralizado ? "" : "w-80 max-w-[calc(100vw-2rem)]"}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Tour do Portal · {passo + 1} de {PASSOS.length}
        </span>
        <button
          type="button"
          onClick={finalizar}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Pular
        </button>
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground mb-1">{atual.menu}</h3>
      <p className="text-sm text-muted-foreground mb-4">{atual.texto}</p>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {PASSOS.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{ width: i === passo ? 18 : 6, background: i === passo ? "hsl(24 87% 56%)" : "hsl(220 12% 25%)" }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (ultimo ? finalizar() : setPasso(passo + 1))}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {ultimo ? "Concluir" : "Próximo"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (desktop && rect) {
    const esquerda = Math.max(16, Math.min(rect.left, window.innerWidth - 336));
    const acima = rect.top > 300;
    return (
      <div className="fixed inset-0 z-[150]" role="dialog" aria-label="Tour de boas-vindas do Portal do Cliente">
        <div
          className="fixed rounded-lg border-2 border-primary"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(5,5,4,0.92)",
            transition: "all 0.35s ease",
          }}
        />
        <div
          className="fixed rounded-xl border border-border bg-card p-4 shadow-2xl"
          style={{
            left: esquerda,
            ...(acima
              ? { bottom: window.innerHeight - rect.top + 16 }
              : { top: rect.top + rect.height + 16 }),
          }}
        >
          {conteudo(false)}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      role="dialog"
      aria-label="Tour de boas-vindas do Portal do Cliente"
      style={{ background: "rgba(5,5,4,0.92)" }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
        {conteudo(true)}
      </div>
    </div>
  );
}