import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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

// Resolve o idioma inicial de forma SÍNCRONA (mesma prioridade do
// LanguageDetector: localStorage > navegador > fallback) para passar como
// `lng` explícito no init(), em vez de deixar só o plugin de detecção
// decidir depois. Bug real visto em produção: com `lng` omitido, sempre
// que o idioma resolvido calhava de ser igual ao fallbackLng ("pt-BR"),
// i18next.isInitialized virava true e i18n.language já reportava "pt-BR"
// corretamente, mas t() continuava devolvendo a própria chave — só um
// changeLanguage() explícito para OUTRO idioma "destravava". Reproduzido
// de forma consistente (clicar no seletor de idioma corrigia na hora;
// clicar no mesmo "PT" já ativo, não). Passar `lng` direto no init() é o
// jeito documentado de evitar essa dependência de timing do plugin.
function resolveInitialLang() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  } catch {
    // localStorage indisponível (modo privado, etc.) — segue pro navegador
  }
  const navLangs = (typeof navigator !== "undefined" && navigator.languages) || [];
  const nav = navLangs[0] || (typeof navigator !== "undefined" && navigator.language) || "";
  const short = nav.toLowerCase();
  if (short.startsWith("pt")) return "pt-BR";
  if (short.startsWith("es")) return "es";
  if (short.startsWith("en")) return "en";
  return "pt-BR";
}

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
      lng: resolveInitialLang(),
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
      //
      // Rede de segurança final: em produção, t() as vezes devolve a própria
      // chave mesmo com o i18next "pronto" e o idioma certo — bug real visto
      // ao vivo (menu inteiro com "nav_overview" etc. na tela), sem causa raiz
      // identificada apesar de 3 tentativas de correção pelo lado do i18next
      // (isInitialized, lng explicito no init, changeLanguage forcado) — nenhuma
      // reproduziu fora do bundle de producao real, o que sugere algo especifico
      // da integracao React/producao dificil de isolar. Em vez de insistir em
      // consertar o estado interno do i18next, aqui garantimos o resultado:
      // se t() falhar (devolver a propria chave), busca direto no dicionario
      // fonte em memoria — sincrono, sempre correto, sem depender de nenhum
      // estado assincrono do i18next.
      t: (key, options) => {
        const result = t(key, options);
        if (result === key) {
          const direct = resources[lang]?.translation?.[key] ?? resources["pt-BR"]?.translation?.[key];
          if (typeof direct === "string") {
            if (!options) return direct;
            // Interpolação manual dos placeholders {{x}} — cobre as chamadas
            // COM options (ex: dash_receita_aguardando, meugrupo_summary,
            // meugrupo_missing_flight/doc, meugrupo_excedente_warning), que
            // era exatamente o caso em que a rede de segurança anterior não
            // entrava e a chave crua aparecia na tela.
            return direct.replace(/\{\{(\w+)\}\}/g, (match, name) =>
              options[name] !== undefined ? String(options[name]) : match
            );
          }
        }
        return result;
      },
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
  // Segura só o primeiro instante (antes de isInitialized) para evitar o
  // flash mais óbvio. A garantia de correção de verdade está no wrapper de
  // t() acima (fallback direto no dicionário fonte) — depois de 3 tentativas
  // de consertar isso só pelo lado do estado interno do i18next (que nunca
  // reproduziu fora do bundle de produção real para eu conseguir validar
  // com certeza), manter esse gate simples e apostar na rede de segurança
  // por chamada é a opção mais confiável.
  const [ready, setReady] = useState(i18next.isInitialized);

  useEffect(() => {
    if (ready) return;
    const onInitialized = () => setReady(true);
    i18next.on("initialized", onInitialized);
    if (i18next.isInitialized) setReady(true);
    return () => i18next.off("initialized", onInitialized);
  }, [ready]);

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

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

// Wrapper de segurança em volta de t("locale_date"): se o i18next ainda não
// tiver terminado de inicializar (ou a chave não resolver por qualquer outro
// motivo), t() devolve a própria chave ("locale_date"), que não é uma tag de
// idioma válida — passar isso direto para toLocaleDateString/toLocaleTimeString
// lança RangeError e derruba a árvore React inteira (sem ErrorBoundary), o que
// na prática trava o app logo após o login. Aqui validamos a tag antes de usar.
export function safeLocaleDate(t) {
  const tag = t("locale_date");
  try {
    if (typeof tag === "string" && Intl.getCanonicalLocales(tag).length > 0) return tag;
  } catch {
    // tag inválida (ex.: a própria chave "locale_date" não traduzida)
  }
  return "pt-BR";
}

// Traduz um nome de categoria salvo (sempre em português no banco) para o idioma
// ativo. Categorias fora do dicionário (novas/personalizadas) retornam como estão.
export function translateCategoria(categoria, lang) {
  if (!categoria) return categoria;
  const key = CATEGORIA_KEY_MAP[(categoria || "").trim().toLowerCase()];
  if (!key) return categoria;
  const result = i18next.getFixedT(lang)(key);
  // Mesma rede de segurança do t() em useLanguage() — getFixedT usa o mesmo
  // mecanismo interno do i18next, então pode sofrer do mesmo problema.
  if (result === key) {
    const direct = translations[lang]?.[key] ?? translations["pt-BR"]?.[key];
    if (direct !== undefined) return direct;
  }
  return result;
}

export { translations };