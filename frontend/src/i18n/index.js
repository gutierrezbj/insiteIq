/**
 * i18n config — InsiteIQ Client space EN/ES.
 *
 * Stack: react-i18next + i18next + LanguageDetector.
 *
 * Detección automática del idioma al cargar:
 *   1. localStorage `i18nextLng` (preferencia explícita del user)
 *   2. browser language (navigator.language)
 *   3. fallback: 'es' (mayoría del equipo SRS opera en ES)
 *
 * Override manual: el toggle del header pone `i18n.changeLanguage('en' | 'es')`
 * y eso persiste en localStorage automáticamente vía LanguageDetector.
 *
 * Namespaces: separamos por área funcional para code-split eficiente cuando
 * el catálogo crezca (hoy todo en `common` está bien para empezar).
 *
 * Lazy loading: por ahora todos los locales bundleados directamente. Si el
 * catálogo crece > 50KB, migramos a backend resource loading.
 *
 * Roadmap deal F4E: scope inicial Client space + páginas que el client puede
 * alcanzar (cockpit, espacio-ops, kanban, WO detail, report). SRS coordinator
 * mantiene ES por ahora.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import esCommon from "./locales/es/common.json";
import enCommon from "./locales/en/common.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { common: esCommon },
      en: { common: enCommon },
    },
    fallbackLng: "es",
    defaultNS: "common",
    ns: ["common"],
    interpolation: {
      escapeValue: false, // React ya escapa
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false, // strings bundleados, no hay async load
    },
  });

export default i18n;
