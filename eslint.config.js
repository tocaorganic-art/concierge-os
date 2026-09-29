import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import pluginI18next from "eslint-plugin-i18next";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    // Guarda-corpo só para as áreas já migradas pra i18next (Portal do
    // Cliente + Chat + TrIA). Nível "warn" (não "error") de propósito: não
    // pode quebrar `pnpm lint` no resto do app, que ainda tem strings PT
    // hardcoded por design (fora do escopo da Fase 3 — ver docs/I18N.md).
    files: [
      "src/pages/Dashboard.jsx",
      "src/pages/Billing.jsx",
      "src/pages/Reports.jsx",
      "src/pages/Solicitacoes.jsx",
      "src/pages/MeuGrupo.jsx",
      "src/pages/MeuContrato.jsx",
      "src/pages/Documentos.jsx",
      "src/pages/ClientProfile.jsx",
      "src/pages/Chat.jsx",
      "src/pages/TocaTrIA.jsx",
      "src/components/client/**/*.{js,jsx}",
      "src/components/chat/**/*.{js,jsx}",
      "src/components/billing/**/*.{js,jsx}",
      "src/components/concierge/**/*.{js,jsx}",
      "src/components/shared/**/*.{js,jsx}",
    ],
    plugins: {
      i18next: pluginI18next,
    },
    rules: {
      "i18next/no-literal-string": [
        "warn",
        {
          markupOnly: true,
          ignoreAttribute: ["data-testid", "className", "class", "to", "href", "id", "name", "type", "key"],
        },
      ],
    },
  },
];
