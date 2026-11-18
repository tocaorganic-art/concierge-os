// Resolve o alias "@/..." (usado em src/) para os testes unitarios em Node puro.
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve(process.cwd(), "src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = path.join(SRC, specifier.slice(2));
    const candidato = [base, `${base}.js`, `${base}.jsx`, path.join(base, "index.js")].find((p) => existsSync(p));
    if (candidato) return nextResolve(pathToFileURL(candidato).href, context);
  }
  return nextResolve(specifier, context);
}
