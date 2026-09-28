import React from "react";

// Capa da Toca Experience no lugar do título "Visão Geral" — abaixo dela,
// os nomes das categorias e o dia/data em pastilhas liquid glass
// (texto branco com sombra laranja), centralizados.
const BANNER_URL =
  "https://media.base44.com/images/public/6a1f06cb2529a2c8784acc2c/dea799c6a_facebook-capa-820x312-final.png";

const CATEGORIAS = ["Experiência", "Reservar", "Exclusivo", "Ajuda"];

export default function DashboardBannerHeader({ data }) {
  return (
    <div className="mb-5 md:mb-8">
      <img
        src={BANNER_URL}
        alt="Toca Experience — Seu próximo destino começa aqui"
        className="w-full rounded-xl border border-border"
      />
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {CATEGORIAS.map((c) => (
          <span key={c} className="liquid-glass rounded-full px-3 py-1.5 text-xs font-medium text-white">
            {c}
          </span>
        ))}
        <span className="liquid-glass rounded-full px-3 py-1.5 text-xs font-medium text-white capitalize">
          {data}
        </span>
      </div>
    </div>
  );
}