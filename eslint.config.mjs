import { dirname } from "path";
import { fileURLToPath } from "url";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";
import noTailwindClasses from "./src/eslint-rules/no-tailwind-classes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import("eslint").Linter.Config[]} */
const config = [
  // ── Ignore non-TypeScript files ────────────────────────────
  {
    ignores: [
      "**/*.md",
      "**/*.mdx",
      "**/*.json",
      "**/*.yaml",
      "**/*.yml",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },

  // ── Next.js rules ─────────────────────────────────────────
  {
    ...nextPlugin.configs.recommended,
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "prisma/migrations/**",
    ],
  },

  // ── TypeScript base rules ────────────────────────────────────
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error", "debug"] }],
    },
  },

  // ── SOLID boundary rule: domain / ports / usecases ────────
  {
    files: ["src/domain/**/*.ts", "src/ports/**/*.ts", "src/usecases/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "next",
                "next/*",
                "next/cache",
                "next/navigation",
                "@prisma/client",
                "@prisma/client/*",
                "paymongo",
                "resend",
                "@sentry/*",
                "server-only",
              ],
              message:
                "Domain / ports / usecases must not import from framework or IO libraries. " +
                "Define a port in src/ports/ and implement it in src/infra/.",
            },
          ],
        },
      ],
    },
  },

  // ── App layer: no direct infra imports ────────────────────
  {
    files: ["src/app/**/*.ts", "src/app/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@prisma/client", "@prisma/client/*", "@infra/*"],
              message:
                "Pages and actions must not import from Prisma or infra directly. " +
                "Use the composition container or a server action.",
            },
          ],
        },
      ],
    },
  },

  // ── Voice: no AI slop ────────────────────────────────────
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "**/*.md"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\bleverage\\b/i]",
          message: "Avoid 'leverage'. Use 'use'.",
        },
        {
          selector: "Literal[value=/\\bdelve\\b/i]",
          message: "Avoid 'delve'. Use 'look at' or 'go through'.",
        },
        {
          selector: "Literal[value=/\\bnavigate the complexities\\b/i]",
          message: "Avoid jargon. State what you mean directly.",
        },
      ],
    },
  },

  // ── Unreachable code is always an error ──────────────────
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-unreachable": "error",
    },
  },
  // ── Local rules ─────────────────────────────────
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: [".next/**", "node_modules/**", "build/**", "dist/**", "out/**", "coverage/**", "playwright-report/**", "test-results/**"],
    plugins: {
      local: {
        rules: {
          "no-tailwind-classes": noTailwindClasses,
        },
      },
    },
    rules: {
      // All known violations have been migrated (PR #64). New code
      // MUST use the design system (CSS Modules + design tokens).
      "local/no-tailwind-classes": "error",
    },
  },
];

export default config;
