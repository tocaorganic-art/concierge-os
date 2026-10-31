// APIs públicas gratuitas, sem chave e com CORS liberado (testadas em 31/10/2026):
// - AwesomeAPI (câmbio para BRL), com Frankfurter (BCE) como reserva
// - BrasilAPI (feriados nacionais)
// - Open-Meteo (geocodificação e previsão do tempo)
// Tudo é informativo: se uma API cair, o widget some ou mostra aviso curto,
// nunca quebra a página. Nenhum dado de cliente é enviado, só o nome do destino.
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO, isAfter, isBefore, max as maxDate, min as minDate } from "date-fns";

async function getJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Câmbio ──────────────────────────────────────────────────────────────
export const MOEDAS_CAMBIO = ["USD", "EUR", "ARS"];

async function buscarCambio() {
  try {
    const pares = MOEDAS_CAMBIO.map((m) => `${m}-BRL`).join(",");
    const data = await getJson(`https://economia.awesomeapi.com.br/json/last/${pares}`);
    const cotacoes = MOEDAS_CAMBIO.map((m) => {
      const item = data[`${m}BRL`];
      return item ? { moeda: m, valor: Number(item.bid), variacaoPct: Number(item.pctChange) } : null;
    }).filter((c) => c && Number.isFinite(c.valor));
    if (cotacoes.length === 0) throw new Error("sem cotações");
    return { fonte: "AwesomeAPI", atualizadoEm: new Date(), cotacoes };
  } catch {
    // Reserva: Frankfurter (taxas de referência do BCE; não cobre ARS).
    const cotacoes = [];
    for (const m of ["USD", "EUR"]) {
      const data = await getJson(`https://api.frankfurter.dev/v1/latest?base=${m}&symbols=BRL`);
      if (data?.rates?.BRL) cotacoes.push({ moeda: m, valor: Number(data.rates.BRL), variacaoPct: null });
    }
    if (cotacoes.length === 0) throw new Error("câmbio indisponível");
    return { fonte: "Frankfurter (BCE)", atualizadoEm: new Date(), cotacoes };
  }
}

export function useCambio() {
  return useQuery({
    queryKey: ["public-api", "cambio"],
    queryFn: buscarCambio,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// Real com até 4 casas para moedas baratas (ex.: ARS).
export function formatCotacao(valor) {
  const casas = valor < 1 ? 4 : 2;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas,
  }).format(valor);
}

// ── Feriados nacionais ─────────────────────────────────────────────────
async function buscarFeriados(ano) {
  const data = await getJson(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
  const mapa = {};
  for (const f of Array.isArray(data) ? data : []) {
    if (f?.date && f?.name) mapa[f.date] = f.name;
  }
  return mapa;
}

// Retorna { "yyyy-MM-dd": "Nome do feriado" } para o ano (e o seguinte, para
// semanas que atravessam a virada do ano).
export function useFeriados(ano) {
  return useQuery({
    queryKey: ["public-api", "feriados", ano],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        buscarFeriados(ano),
        buscarFeriados(ano + 1).catch(() => ({})),
      ]);
      return { ...a, ...b };
    },
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// ── Previsão do tempo do destino ───────────────────────────────────────
const JANELA_PREVISAO_DIAS = 16;
const MAX_DIAS_EXIBIDOS = 7;

const normalizar = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Escolhe o melhor resultado: prioriza o Brasil (operação é nacional; evita
// "Trancoso" cair no México) e usa o resto do texto ("Praia Brava, Itajaí")
// para desempatar pela cidade/estado. Sem Brasil, fica com o primeiro (ex.:
// "Buenos Aires").
function melhorResultado(resultados, contexto) {
  if (!resultados?.length) return null;
  const pontua = (r) => {
    const regioes = [r.admin1, r.admin2, r.admin3, r.admin4].map(normalizar);
    let p = r.country_code === "BR" ? 2 : 0;
    for (const c of contexto) if (c && regioes.some((reg) => reg && (reg.includes(c) || c.includes(reg)))) p += 3;
    return p;
  };
  return resultados.reduce((melhor, r) => (pontua(r) > pontua(melhor) ? r : melhor), resultados[0]);
}

async function geocodificar(destino, lang) {
  const idioma = (lang || "pt").slice(0, 2);
  const partes = destino.split(/[,/(\-]/).map((s) => s.replace(/\)/g, "").trim()).filter(Boolean);
  // Tenta o nome principal (com o resto como contexto) e, se não achar, cada
  // parte seguinte (ex.: "Jurerê Internacional, Florianópolis" cai na cidade).
  const tentativas = [...new Set([partes[0], ...partes.slice(1)].filter(Boolean))];
  for (const [i, nome] of tentativas.entries()) {
    const contexto = partes.filter((_, j) => j !== i).map(normalizar);
    const data = await getJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=10&language=${idioma}`
    );
    const r = melhorResultado(data?.results, contexto);
    if (r) return { lat: r.latitude, lon: r.longitude, nome: r.name };
  }
  return null;
}

// Calcula a janela de previsão possível para a viagem.
// status: "fora" (já passou ou sem data), "cedo" (chegada além de 16 dias), "ok"
export function janelaPrevisao(dataChegada, dataSaida, hoje = new Date()) {
  if (!dataChegada) return { status: "fora" };
  const inicioHoje = parseISO(format(hoje, "yyyy-MM-dd"));
  const chegada = parseISO(dataChegada);
  const saida = dataSaida ? parseISO(dataSaida) : chegada;
  const limite = addDays(inicioHoje, JANELA_PREVISAO_DIAS - 1);
  if (isBefore(saida, inicioHoje)) return { status: "fora" };
  if (isAfter(chegada, limite)) return { status: "cedo" };
  const inicio = maxDate([chegada, inicioHoje]);
  const fim = minDate([saida, limite, addDays(inicio, MAX_DIAS_EXIBIDOS - 1)]);
  return { status: "ok", inicio: format(inicio, "yyyy-MM-dd"), fim: format(fim, "yyyy-MM-dd") };
}

async function buscarPrevisao(destino, inicio, fim, lang) {
  const local = await geocodificar(destino, lang);
  if (!local) return null;
  const params = new URLSearchParams({
    latitude: String(local.lat),
    longitude: String(local.lon),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    start_date: inicio,
    end_date: fim,
  });
  const data = await getJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  const d = data?.daily;
  if (!d?.time?.length) return null;
  return {
    local: local.nome,
    dias: d.time.map((dia, i) => ({
      data: dia,
      codigo: d.weather_code?.[i],
      max: d.temperature_2m_max?.[i],
      min: d.temperature_2m_min?.[i],
      chuvaPct: d.precipitation_probability_max?.[i],
    })),
  };
}

export function usePrevisaoDestino(destino, janela, lang) {
  return useQuery({
    queryKey: ["public-api", "previsao", destino, janela?.inicio, janela?.fim, lang],
    queryFn: () => buscarPrevisao(destino, janela.inicio, janela.fim, lang),
    enabled: Boolean(destino) && janela?.status === "ok",
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
