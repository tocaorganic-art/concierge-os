import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useLanguage, safeLocaleDate } from "@/lib/i18n";
import { useCambio, formatCotacao } from "@/lib/publicApis";

// Cotação do dia para BRL (USD, EUR, ARS). Ajuda a orçar para clientes
// estrangeiros. Só informativo: nunca entra em cálculo financeiro do app.
export default function DashboardCambio() {
  const { t } = useLanguage();
  const localeDate = safeLocaleDate(t);
  const { data, isLoading, isError } = useCambio();

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">{t("api_cambio_title")}</h3>
      {isLoading && (
        <div className="grid grid-cols-3 gap-3" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-secondary/40 animate-pulse" />)}
        </div>
      )}
      {!isLoading && (isError || !data) && (
        <p className="text-sm text-muted-foreground">{t("api_cambio_unavailable")}</p>
      )}
      {!isLoading && data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {data.cotacoes.map((c) => {
              const subiu = Number(c.variacaoPct) > 0;
              const temVariacao = Number.isFinite(c.variacaoPct) && c.variacaoPct !== 0;
              return (
                <div key={c.moeda} className="rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{c.moeda} / BRL</p>
                  <p className="text-base font-semibold text-foreground">{formatCotacao(c.valor)}</p>
                  {temVariacao && (
                    <p className={`inline-flex items-center gap-0.5 text-[11px] ${subiu ? "text-success" : "text-destructive"}`}>
                      {subiu ? <ArrowUpRight className="w-3 h-3" aria-hidden="true" /> : <ArrowDownRight className="w-3 h-3" aria-hidden="true" />}
                      {Math.abs(c.variacaoPct).toLocaleString(localeDate, { maximumFractionDigits: 2 })}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            {t("api_cambio_source")}: {data.fonte} · {t("dash_updated_at")}{" "}
            {data.atualizadoEm.toLocaleTimeString(localeDate, { hour: "2-digit", minute: "2-digit" })}
          </p>
        </>
      )}
    </div>
  );
}
