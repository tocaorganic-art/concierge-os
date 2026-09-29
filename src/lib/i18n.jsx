import React, { createContext, useContext, useEffect, useMemo } from "react";
import i18next from "i18next";
import { initReactI18next, I18nextProvider, useTranslation } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { resources, translations, CATEGORIA_KEY_MAP } from "./i18nResources";

const SUPPORTED_LANGS = ["pt-BR", "en", "es"];
const STORAGE_KEY = "concierge_lang";

// Instância única do i18next para o app inteiro. Guardamos no objeto do
// módulo (não em estado React) porque o i18next já é o "single source of
// truth" do idioma atual — replicar isso em estado React duplicaria a
// fonte de verdade e criaria dessincronia.
if (!i18next.isInitialized) {
  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "pt-BR",
      supportedLngs: SUPPORTED_LANGS,
      nonExplicitSupportedLngs: true,
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: STORAGE_KEY,
        caches: ["localStorage"],
      },
      interpolation: { escapeValue: false },
      returnEmptyString: false,
    });
}

const LanguageContext = createContext(null);

function LanguageProviderInner({ children }) {
  const { t, i18n } = useTranslation();
  const lang = SUPPORTED_LANGS.includes(i18n.language) ? i18n.language : "pt-BR";

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      // t(key) — mesma assinatura de antes; i18next cai para pt-BR (fallbackLng)
      // quando a chave não existe no idioma atual, e devolve a própria chave
      // se também não existir em pt-BR (igual ao comportamento anterior).
      t: (key) => t(key),
      setLang: (l) => i18n.changeLanguage(l),
    }),
    [lang, t, i18n]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function LanguageProvider({ children }) {
  return (
    <I18nextProvider i18n={i18next}>
      <LanguageProviderInner>{children}</LanguageProviderInner>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

// Traduz um nome de categoria salvo (sempre em português no banco) para o idioma
// ativo. Categorias fora do dicionário (novas/personalizadas) retornam como estão.
export function translateCategoria(categoria, lang) {
  if (!categoria) return categoria;
  const key = CATEGORIA_KEY_MAP[(categoria || "").trim().toLowerCase()];
  if (!key) return categoria;
  return i18next.getFixedT(lang)(key);
}

export { translations };
