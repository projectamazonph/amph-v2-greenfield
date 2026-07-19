import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    globals: true,
    setupFiles: [],
    include: [
      "src/**/__tests__/**/*.test.ts",
      "src/**/__tests__/**/*.test.tsx",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "src/eslint-rules/**/*.test.js",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/__tests__/**",
        "node_modules/**",
        ".next/**",
        "build/**",
        "dist/**",
        "**/vendor/**",
        "prisma/**",
        // Production composition + Prisma adapters — only exercised
        // against a real database (integration tests use the in-memory
        // repos via buildTestContainer). P0-2 audit item: these will
        // gain coverage as the in-memory → Prisma migration proceeds.
        "src/composition/container.ts",
        "src/infra/repositories/Prisma*.ts",
        "src/infra/payment/Prisma*.ts",
        "src/infra/database/prisma.ts",
      ],
    },
  },
});
