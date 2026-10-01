// Fase 4 — sistema de cores da UI. Fonte única do mapa
// "significado → cor": nenhuma tela escreve hex nem escolhe a cor de um
// status/KPI/categoria por conta própria. As cores em si são tokens CSS
// (--success, --warning, --danger, --info, --cat-*) definidos em
// src/index.css e registrados em tailwind.config.js, então trocar a paleta
// depois é editar um lugar só.
//
// Regra do tema: o fundo continua dark (bg-card/bg-background). A cor entra
// apenas como destaque pontual — ícone, valor, borda, badge — e sempre em
// elementos que carregam significado.

import { Home, Bus, Users, HeartPulse, ShoppingCart, Music, Briefcase } from "lucide-react";

// Tons semânticos de KPI/valor.
//   success  → dinheiro que entrou, tarefa concluída
//   warning  → pendência, a pagar, alerta de contrato
//   danger   → atraso, inadimplência, margem negativa
//   info     → informativo/custódia (dinheiro que passa, não é receita)
//   gold     → identidade da marca (laranja/terracota Toca), neutro de destaque
//   neutral  → contagem sem carga financeira
export const TONES = {
  success: { icon: "bg-success/12 text-success", value: "text-success", border: "border-success/30" },
  warning: { icon: "bg-warning/12 text-warning", value: "text-warning", border: "border-warning/30" },
  danger: { icon: "bg-danger/12 text-danger", value: "text-danger", border: "border-danger/30" },
  info: { icon: "bg-info/12 text-info", value: "text-info", border: "border-info/30" },
  // gold é o tom padrão: ícone na cor da marca, valor em branco — não
  // colore número que não carrega sinal (evita virar poluição visual).
  gold: { icon: "bg-primary/12 text-primary", value: "text-foreground", border: "border-primary/30" },
  neutral: { icon: "bg-muted text-muted-foreground", value: "text-foreground", border: "border-border" },
};

export function tone(name) {
  return TONES[name] || TONES.gold;
}

// Cores selecionáveis em BillingCategory.cor (Fase 5). Mesmos tons de TONES —
// nenhuma paleta nova; `dot` é a bolinha sólida do seletor/lista.
export const CATEGORY_COLORS = [
  { value: "gold", dot: "bg-primary" },
  { value: "success", dot: "bg-success" },
  { value: "warning", dot: "bg-warning" },
  { value: "danger", dot: "bg-danger" },
  { value: "info", dot: "bg-info" },
  { value: "neutral", dot: "bg-muted-foreground" },
];

export function categoryDot(cor) {
  return (CATEGORY_COLORS.find((c) => c.value === cor) || CATEGORY_COLORS[0]).dot;
}

// Categoria de fornecedor (ContratoFornecedor.categoria é texto livre — ver
// CATEGORIAS_FORNECEDOR em ContratoFornecedorFormDialog.jsx). O match é por
// palavra-chave normalizada para aceitar variações digitadas à mão
// ("van", "transporte", "equipe da casa").
const CATEGORIAS = [
  { chaves: ["imovel", "imóvel", "casa", "mansao", "mansão", "locacao", "locação"], Icon: Home, className: "text-cat-imovel", bg: "bg-cat-imovel/12" },
  { chaves: ["transporte", "van", "carro", "motorista"], Icon: Bus, className: "text-cat-transporte", bg: "bg-cat-transporte/12" },
  { chaves: ["equipe", "staff", "caseiro", "chef", "cozinha"], Icon: Users, className: "text-cat-equipe", bg: "bg-cat-equipe/12" },
  { chaves: ["bem-estar", "bem estar", "massagista", "massagem", "spa", "yoga"], Icon: HeartPulse, className: "text-cat-bemestar", bg: "bg-cat-bemestar/12" },
  { chaves: ["compras", "mercado", "supermercado", "bebidas"], Icon: ShoppingCart, className: "text-cat-compras", bg: "bg-cat-compras/12" },
  { chaves: ["som", "dj", "musica", "música", "audio", "áudio"], Icon: Music, className: "text-cat-som", bg: "bg-cat-som/12" },
];

const CATEGORIA_FALLBACK = { Icon: Briefcase, className: "text-cat-outros", bg: "bg-cat-outros/12" };

export function categoriaFornecedorVisual(categoria) {
  const norm = (categoria || "").trim().toLowerCase();
  if (!norm) return CATEGORIA_FALLBACK;
  const match = CATEGORIAS.find((c) => c.chaves.some((k) => norm.includes(k)));
  return match ? { Icon: match.Icon, className: match.className, bg: match.bg } : CATEGORIA_FALLBACK;
}
