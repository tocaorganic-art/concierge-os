#!/usr/bin/env node
// Falha se alguma chave existir em pt-BR (idioma-fonte) e faltar em en/es,
// ou se en/es tiverem chaves "órfãs" que não existem em pt-BR.
import { translations } from "../src/lib/i18nResources.js";

const BASE_LANG = "pt-BR";
const OTHER_LANGS = Object.keys(translations).filter((l) => l !== BASE_LANG);

const baseKeys = new Set(Object.keys(translations[BASE_LANG]));
let hasError = false;

for (const lang of OTHER_LANGS) {
  const langKeys = new Set(Object.keys(translations[lang]));

  const missing = [...baseKeys].filter((k) => !langKeys.has(k));
  const orphan = [...langKeys].filter((k) => !baseKeys.has(k));

  if (missing.length) {
    hasError = true;
    console.error(`\n[i18n:check] Faltando em "${lang}" (${missing.length}):`);
    missing.forEach((k) => console.error(`  - ${k}`));
  }
  if (orphan.length) {
    hasError = true;
    console.error(`\n[i18n:check] Chaves órfãs em "${lang}" (não existem em ${BASE_LANG}) (${orphan.length}):`);
    orphan.forEach((k) => console.error(`  - ${k}`));
  }
}

if (hasError) {
  console.error("\n[i18n:check] FALHOU — rode `pnpm i18n:fill` para gerar rascunhos das traduções faltantes.\n");
  process.exit(1);
}

console.log(`[i18n:check] OK — ${baseKeys.size} chaves consistentes entre ${[BASE_LANG, ...OTHER_LANGS].join(", ")}.`);
