import React from "react";
import { Link } from "react-router-dom";

export default function KpiCard({ title, value, icon: Icon, trend, trendLabel, valueClassName, to }) {
  const isPositive = trend > 0;
  const Wrapper = to ? Link : "div";
  const wrapperProps = to ? { to } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`bg-card border border-border rounded-xl p-5 gold-border-hover transition-all duration-300 block text-left ${to ? "cursor-pointer hover:border-primary/40" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-mono px-2 py-1 rounded-md ${
            isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}>
            {isPositive ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
        {title}
      </p>
      <p className={`font-display text-2xl font-bold ${valueClassName || "text-foreground"}`}>
        {value}
      </p>
      {trendLabel && (
        <p className="text-xs text-muted-foreground mt-1">{trendLabel}</p>
      )}
    </Wrapper>
  );
}
