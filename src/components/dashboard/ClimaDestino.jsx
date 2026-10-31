import React from "react";
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Droplets } from "lucide-react";
import { useLanguage, safeLocaleDate } from "@/lib/i18n";
import { janelaPrevisao, usePrevisaoDestino } from "@/lib/publicApis";

// Código WMO (Open-Meteo) para ícone.
function iconeDoTempo(codigo) {
  if (codigo === 0) return Sun;
  if (codigo === 1 || codigo === 2) return CloudSun;
  if (codigo === 3) return Cloud;
  if (codigo === 45 || codigo === 48) return CloudFog;
  if (codigo >= 51 && codigo <= 57) return CloudDrizzle;
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return CloudRain;
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return CloudSnow;
  if (codigo >= 95) return CloudLightning;
  return Cloud;
}

// Previsão do tempo no destino durante a viagem (até 7 dias, dentro da janela
// de 16 dias do Open-Meteo). Some quando a viagem já passou ou não há destino.
export default function ClimaDestino({ proposta }) {
  const { t, lang } = useLanguage();
  const localeDate = safeLocaleDate(t);
  const destino = (proposta?.destino || "").trim();
  const janela = janelaPrevisao(proposta?.data_chegada, proposta?.data_saida);
  const { data, isLoading, isError } = usePrevisaoDestino(destino, janela, lang);

  if (!destino || janela.status === "fora") return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 gold-border-hover">
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
        {t("api_clima_title", { destino })}
      </h3>

      {janela.status === "cedo" && (
        <p className="text-sm text-muted-foreground">{t("api_clima_soon")}</p>
      )}

      {janela.status === "ok" && isLoading && (
        <div className="flex gap-3 overflow-hidden" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 w-20 flex-shrink-0 rounded-lg bg-secondary/40 animate-pulse" />)}
        </div>
      )}

      {janela.status === "ok" && !isLoading && (isError || !data) && (
        <p className="text-sm text-muted-foreground">{t("api_clima_unavailable")}</p>
      )}

      {janela.status === "ok" && !isLoading && data && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {data.dias.map((dia) => {
            const Icone = iconeDoTempo(dia.codigo);
            const dataDia = new Date(`${dia.data}T00:00:00`);
            return (
              <div key={dia.data} className="flex-shrink-0 w-20 rounded-lg border border-border bg-secondary/30 p-3 text-center">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {dataDia.toLocaleDateString(localeDate, { weekday: "short" })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {dataDia.toLocaleDateString(localeDate, { day: "2-digit", month: "2-digit" })}
                </p>
                <Icone className="w-6 h-6 text-primary mx-auto my-1.5" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">
                  {Math.round(dia.max)}° <span className="text-muted-foreground font-normal">{Math.round(dia.min)}°</span>
                </p>
                {Number.isFinite(dia.chuvaPct) && (
                  <p className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" title={t("api_clima_rain")}>
                    <Droplets className="w-3 h-3" aria-hidden="true" />
                    {dia.chuvaPct}% <span className="sr-only">{t("api_clima_rain")}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
