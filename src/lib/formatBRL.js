// Formatador único de dinheiro do app — sempre Real brasileiro (R$), em PT, ES e EN.
// Nunca derivar o símbolo/moeda do idioma ativo (bug antigo: ES mostrava "€").
export function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}
