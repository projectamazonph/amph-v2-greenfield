import { describe, expect, it } from "vitest";
import vercelConfig from "../../../vercel.json";

describe("Vercel build command", () => {
  it("deploys production migrations without a shadow database", () => {
    expect(vercelConfig.buildCommand).toContain('[ "$VERCEL_ENV" = "production" ]');
    expect(vercelConfig.buildCommand).toContain("SHADOW_DATABASE_URL= pnpm prisma:deploy");
    expect(vercelConfig.buildCommand).toMatch(/fi && pnpm build$/);
  });
});
