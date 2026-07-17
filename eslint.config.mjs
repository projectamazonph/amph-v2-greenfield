import { dirname } from "path";
import { fileURLToPath } from "url";
import nextPlugin from "@next/eslint-plugin-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import("eslint").Linter.Config[]} */
const config = [
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

  // ── Base rules (no TypeScript AST — TS types handled by pnpm typecheck) ──
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // Only rules that work without a TS-aware parser
      "no-console": ["warn", { allow: ["warn", "error"] }],
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
];

export default config;
