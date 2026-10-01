import React from "react";
import { Link } from "react-router-dom";
import { tone as toneClasses } from "@/lib/uiTones";

// `tone` dá a cor de destaque do cartão conforme a natureza do número
// (success/warning/danger/info/gold/neutral — ver src/lib/uiTones.js).
// Sem `tone`, mantém o dourado/laranja da marca, que era o comportamento
// anterior. `valueClassName` continua tendo prioridade sobre a cor do tom
// para as telas que já definem a cor do valor na mão.
export default function KpiCard({ title, value, icon: Icon, trend, trendLabel, valueClassName, to, tone = "gold" }) {
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
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
        {title}
      </p>
      <p className={`font-display text-xl md:text-2xl font-bold break-words ${valueClassName || paleta.value}`}>
        {value}
      </p>
      {trendLabel && (
        <p className="text-xs text-muted-foreground mt-1">{trendLabel}</p>
      )}
    </Wrapper>
  );
}