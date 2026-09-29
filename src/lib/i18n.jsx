import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import i18next from "i18next";
import { initReactI18next, I18nextProvider, useTranslation } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { base44 } from "@/api/base44Client";
import { resources, translations, CATEGORIA_KEY_MAP } from "./i18nResources";

const SUPPORTED_LANGS = ["pt-BR", "en", "es"];
const STORAGE_KEY = "concierge_lang";

// Capturado ANTES do i18next.init (que pode gravar no localStorage via
// LanguageDetector) — indica se o usuário já tinha escolhido um idioma
// manualmente em algum momento, neste navegador.
const hadStoredLangBeforeInit =
  typeof window !== "undefined" && !!window.localStorage.getItem(STORAGE_KEY);

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

// Resolve um idioma padrão "inteligente" quando o usuário ainda não escolheu
// nenhum manualmente neste navegador: User.preferred_language (troca de
// dispositivo) e, para clientes, Client.idioma_padrao (definido pela equipe
// no cadastro, ex.: grupo argentino em espanhol). Nunca sobrepõe uma escolha
// manual já salva — só roda quando `hadStoredLangBeforeInit` é false.
async function resolveSmartDefaultLang() {
  try {
    const user = await base44.auth.me();
    if (!user) return null;
    if (user.preferred_language && SUPPORTED_LANGS.includes(user.preferred_language)) {
      return user.preferred_language;
    }
    if (user.account_type === "cliente" && user.client_id) {
      const [client] = await base44.entities.Client.filter({ id: user.client_id });
      if (client?.idioma_padrao && SUPPORTED_LANGS.includes(client.idioma_padrao)) {
        return client.idioma_padrao;
      }
    }
  } catch {
    // não autenticado ainda, ou erro de rede — mantém a detecção padrão
    // (localStorage/idioma do navegador) sem interromper a UI.
  }
  return null;
}

function LanguageProviderInner({ children }) {
  const { t, i18n } = useTranslation();
  const lang = SUPPORTED_LANGS.includes(i18n.language) ? i18n.language : "pt-BR";
  const smartDefaultRan = useRef(false);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (hadStoredLangBeforeInit || smartDefaultRan.current) return;
    smartDefaultRan.current = true;
    resolveSmartDefaultLang().then((smartLang) => {
      if (smartLang && smartLang !== i18n.language) i18n.changeLanguage(smartLang);
    });
  }, [i18n]);

  const value = useMemo(
    () => ({
      lang,
      // t(key, options?) — compatível com a assinatura antiga t(key), mas aceita
      // um segundo argumento opcional para interpolação/plural do i18next
      // (ex: t("key", { count: 3 })). i18next cai para pt-BR (fallbackLng)
      // quando a chave não existe no idioma atual, e devolve a própria chave
      // se também não existir em pt-BR (igual ao comportamento anterior).
      t: (key, options) => t(key, options),
      setLang: (l) => {
        i18n.changeLanguage(l);
        // Persiste no perfil do usuário (best-effort) para funcionar entre
        // dispositivos, além do localStorage local. Nunca bloqueia a troca
        // de idioma na UI, mesmo se a chamada falhar.
        base44.auth.updateMe({ preferred_language: l }).catch(() => {});
      },
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
