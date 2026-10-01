import React, { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { tone as toneClasses } from "@/lib/uiTones";

// ⓘ ao lado do título. Mouse: abre no hover. Toque: abre/fecha ao tocar e
// fecha ao tocar fora. Teclado: abre ao focar (só :focus-visible — no toque o
// foco por tap também dispararia onFocus e anularia o click). O tipo do ponteiro é checado porque no toque o
// navegador emula mouseenter e depois dispara click — sem isso o balão abria e
// fechava no mesmo toque. Não usa o Tooltip do Radix porque ele não abre com toque.
function InfoHint({ text }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const tipoPonteiro = useRef("mouse");

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharFora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("pointerdown", fecharFora);
    return () => document.removeEventListener("pointerdown", fecharFora);
  }, [aberto]);

  return (
    <span ref={ref} className="relative inline-flex flex-shrink-0">
      <button
        type="button"
        aria-label={text}
        aria-expanded={aberto}
        onPointerDown={(e) => { tipoPonteiro.current = e.pointerType; }}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") setAberto(true); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setAberto(false); }}
        onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) setAberto(true); }}
        onBlur={() => setAberto(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAberto((v) => (tipoPonteiro.current === "mouse" ? true : !v));
        }}
        className="min-h-0 min-w-0 p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {aberto && (
        <span role="tooltip" className="absolute left-0 top-full mt-1.5 z-30 w-64 rounded-lg border border-border bg-popover px-3 py-2 text-[11px] normal-case tracking-normal font-sans font-normal leading-snug text-popover-foreground shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

// `tone` dá a cor de destaque do cartão conforme a natureza do número
// (success/warning/danger/info/gold/neutral — ver src/lib/uiTones.js).
// Sem `tone`, mantém o dourado/laranja da marca, que era o comportamento
// anterior. `valueClassName` continua tendo prioridade sobre a cor do tom
// para as telas que já definem a cor do valor na mão.
// `titleHint`: texto do ⓘ ao lado do título. `extra`: linha abaixo do valor (ex.: link).
export default function KpiCard({ title, value, icon: Icon, trend, trendLabel, valueClassName, to, tone = "gold", titleHint, extra }) {
  const isPositive = trend > 0;
  const paleta = toneClasses(tone);
  const Wrapper = to ? Link : "div";
  const wrapperProps = to ? { to } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`bg-card border border-border rounded-xl p-4 md:p-5 gold-border-hover transition-all duration-300 block text-left ${to ? "cursor-pointer hover:border-primary/40" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paleta.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-mono px-2 py-1 rounded-md ${
            isPositive ? "bg-success/12 text-success" : "bg-danger/12 text-danger"
          }`}>
            {isPositive ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-start gap-1.5">
        <span>{title}</span>
        {titleHint && <InfoHint text={titleHint} />}
      </p>
      <p className={`font-display text-xl md:text-2xl font-bold break-words ${valueClassName || paleta.value}`}>
        {value}
      </p>
      {extra && <div className="mt-1.5 text-xs">{extra}</div>}
      {trendLabel && (
        <p className="text-xs text-muted-foreground mt-1">{trendLabel}</p>
      )}
    </Wrapper>
  );
}