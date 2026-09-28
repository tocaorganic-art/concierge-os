import React from "react";

// Capa no lugar do título da página — abaixo dela, os nomes das categorias
// e o dia/data em pastilhas liquid glass (texto branco com sombra laranja),
// centralizados. Usada na Visão Geral (imagem Toca Experience) e no Pipeline
// (imagem Trancoso Resolve), via props com os mesmos padrões.
const BANNER_URL =
  "https://media.base44.com/images/public/6a1f06cb2529a2c8784acc2c/dea799c6a_facebook-capa-820x312-final.png";

const CATEGORIAS = ["Experiência", "Reservar", "Exclusivo", "Ajuda"];

export default function DashboardBannerHeader({ data, bannerUrl = BANNER_URL, alt = "Toca Experience — Seu próximo destino começa aqui", categorias = CATEGORIAS }) {
  return (
    <div className="mb-5 md:mb-8">
      <img
        src={bannerUrl}
        alt={alt}
        className="w-full rounded-xl border border-border"
      />
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {categorias.map((c) => (
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