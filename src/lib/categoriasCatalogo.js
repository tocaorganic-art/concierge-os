// Fase 5 — catálogo próprio de categorias (entidade BillingCategory).
// Antes a lista de categorias era derivada por distinct() dos valores já
// gravados em Expense/Billing, então uma categoria criada e não usada em um
// registro real sumia. Agora o dropdown lê daqui, e "criar nova categoria"
// grava no catálogo na hora.
//
// Expense.categoria / Billing.categoria continuam sendo TEXTO (o nome), não
// id: registros históricos não mudam, e renomear/desativar uma categoria no
// catálogo nunca reescreve nem apaga registro antigo.

import { base44 } from "@/api/base44Client";

export const TIPO_DESPESA = "despesa";
export const TIPO_COBRANCA = "cobranca";

export const SEED_CATEGORIAS = {
  [TIPO_DESPESA]: ["Aluguel de Som", "Compras", "Equipe/Pessoal", "Imóvel", "Outros", "Transporte", "Contrato Toca"],
  [TIPO_COBRANCA]: ["Pacote Principal", "Contas a Pagar", "Reserva Financeira", "Honorário de Concierge", "Contrato Toca"],
};

export const norm = (s) => (s || "").trim().toLowerCase();
const chave = (nome, tipo) => `${tipo}::${norm(nome)}`;

// Dedupe por (nome normalizado, tipo): mantém o primeiro registro de cada par.
export function dedupeCatalogo(registros = []) {
  const vistos = new Map();
  registros.forEach((r) => {
    const k = chave(r.nome, r.tipo);
    if (norm(r.nome) && !vistos.has(k)) vistos.set(k, r);
  });
  return Array.from(vistos.values());
}

// Nomes ativos de um tipo, ordenados, sem duplicar.
export function nomesAtivos(registros = [], tipo) {
  return dedupeCatalogo(registros.filter((r) => r.tipo === tipo && r.ativo !== false))
    .map((r) => r.nome)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Calcula o que falta criar para o catálogo cobrir seed + categorias já em
// uso (migração retroativa). Pura e testável: não toca no banco.
export function categoriasFaltantes({ catalogo = [], despesas = [], cobrancas = [] }) {
  const existentes = new Set(catalogo.map((r) => chave(r.nome, r.tipo)));
  const faltantes = [];
  const adicionar = (nome, tipo) => {
    const n = (nome || "").trim();
    if (!n) return;
    const k = chave(n, tipo);
    if (existentes.has(k)) return;
    existentes.add(k);
    faltantes.push({ nome: n, tipo });
  };
  Object.entries(SEED_CATEGORIAS).forEach(([tipo, nomes]) => nomes.forEach((nome) => adicionar(nome, tipo)));
  despesas.forEach((e) => adicionar(e.categoria, TIPO_DESPESA));
  cobrancas.forEach((b) => adicionar(b.categoria, TIPO_COBRANCA));
  return faltantes;
}

// Seed + migração retroativa, idempotente: roda quantas vezes for chamada e
// só cria o que ainda não existe (mesmo nome + tipo). Categoria em uso por
// registros antigos entra como ativa. Nunca apaga nem desativa nada.
export async function sincronizarCatalogo() {
  const [catalogo, despesas, cobrancas] = await Promise.all([
    base44.entities.BillingCategory.list("-created_date", 1000),
    base44.entities.Expense.list("-created_date", 1000),
    base44.entities.Billing.list("-created_date", 1000),
  ]);
  const faltantes = categoriasFaltantes({ catalogo, despesas, cobrancas });
  const agora = new Date().toISOString();
  await Promise.all(
    faltantes.map((c) =>
      base44.entities.BillingCategory.create({ nome: c.nome, tipo: c.tipo, cor: "gold", ativo: true, criado_em: agora })
    )
  );
  return { criadas: faltantes.length };
}

// Cria uma categoria nova no catálogo já no momento da confirmação (não
// espera o formulário pai ser salvo). Se já existir com o mesmo nome+tipo:
// ativa → reaproveita; desativada → reativa. Devolve o nome canônico.
export async function criarOuReativarCategoria({ nome, tipo, cor = "gold" }) {
  const limpo = (nome || "").trim();
  if (!limpo) return null;
  const existentes = await base44.entities.BillingCategory.filter({ tipo });
  const igual = existentes.find((r) => norm(r.nome) === norm(limpo));
  if (igual) {
    if (igual.ativo === false) await base44.entities.BillingCategory.update(igual.id, { ativo: true });
    return igual.nome;
  }
  await base44.entities.BillingCategory.create({ nome: limpo, tipo, cor, ativo: true, criado_em: new Date().toISOString() });
  return limpo;
}

// Garante que o nome exista no catálogo SEM reativar uma categoria que o
// admin desativou (salvar um registro antigo com categoria desativada não
// pode "ressuscitá-la"). Cobre o caso da categoria sugerida pela IA no
// comprovante, que chega ao formulário sem passar por "+ Criar nova".
export async function garantirCategoria({ nome, tipo }) {
  const limpo = (nome || "").trim();
  if (!limpo) return;
  const existentes = await base44.entities.BillingCategory.filter({ tipo });
  if (existentes.some((r) => norm(r.nome) === norm(limpo))) return;
  await base44.entities.BillingCategory.create({ nome: limpo, tipo, cor: "gold", ativo: true, criado_em: new Date().toISOString() });
}

// Opções do dropdown de um registro existente: as ativas + a categoria que o
// registro já usa (mesmo desativada), para ela continuar aparecendo e
// selecionada na edição de lançamentos antigos.
export function opcoesComAtual(categorias, atual) {
  if (!atual || categorias.some((c) => norm(c) === norm(atual))) return categorias;
  return [...categorias, atual];
}
