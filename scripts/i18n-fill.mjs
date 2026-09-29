#!/usr/bin/env node
// Rascunha traduções faltantes em en/es a partir do texto-fonte pt-BR,
// inserindo no final de cada bloco de idioma em src/lib/i18nResources.js.
// NUNCA sobrescreve uma chave já existente — só adiciona as que faltam.
// Cada rascunho é marcado com o prefixo [REVISAR] para revisão manual/IA
// antes de ir pra produção (este script não tem acesso a um provedor de
// LLM neste ambiente local, então o "draft" aqui é o texto em pt-BR como
// placeholder, não uma tradução automática).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { translations } from "../src/lib/i18nResources.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.join(__dirname, "../src/lib/i18nResources.js");
const BASE_LANG = "pt-BR";
const TARGET_LANGS = Object.keys(translations).filter((l) => l !== BASE_LANG);

let source = readFileSync(FILE_PATH, "utf-8");
let totalAdded = 0;

for (const lang of TARGET_LANGS) {
  const baseKeys = Object.keys(translations[BASE_LANG]);
  const langKeys = new Set(Object.keys(translations[lang]));
  const missing = baseKeys.filter((k) => !langKeys.has(k));

  if (!missing.length) {
    console.log(`[i18n:fill] "${lang}" já está completo.`);
    continue;
  }

  const blockStartMarker = lang === BASE_LANG ? `"${BASE_LANG}": {` : `${lang}: {`;
  const startIdx = source.indexOf(`\n  ${blockStartMarker}\n`);
  if (startIdx === -1) {
    console.error(`[i18n:fill] Não encontrei o bloco de "${lang}" em i18nResources.js — pulando (insira manualmente).`);
    continue;
  }
  const blockContentStart = startIdx + `\n  ${blockStartMarker}\n`.length;
  const closeIdx = source.indexOf("\n  },\n", blockContentStart);
  if (closeIdx === -1) {
    console.error(`[i18n:fill] Não encontrei o fechamento do bloco de "${lang}" — pulando.`);
    continue;
  }

  const draftLines = missing
    .map((key) => {
      const draftValue = `[REVISAR] ${translations[BASE_LANG][key]}`;
      return `    ${key}: ${JSON.stringify(draftValue)},`;
    })
    .join("\n");

  const insertion = `\n    // --- i18n:fill (rascunho automático, revisar antes de publicar) ---\n${draftLines}\n`;
  source = source.slice(0, closeIdx) + insertion + source.slice(closeIdx);

  console.log(`[i18n:fill] "${lang}": ${missing.length} chave(s) rascunhada(s) com [REVISAR].`);
  totalAdded += missing.length;
}

if (totalAdded > 0) {
  writeFileSync(FILE_PATH, source, "utf-8");
  console.log(`\n[i18n:fill] ${totalAdded} rascunho(s) inserido(s) em src/lib/i18nResources.js. Revise as entradas marcadas com [REVISAR] antes de publicar.`);
} else {
  console.log("\n[i18n:fill] Nada a fazer — todos os idiomas já estão completos.");
}
