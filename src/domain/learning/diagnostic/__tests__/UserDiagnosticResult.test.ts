import { describe, expect, it } from "vitest";
import { createDiagnosticResult } from "../UserDiagnosticResult";

describe("createDiagnosticResult", () => {
  it("creates a result for 'new' outcome", () => {
    const fixedDate = new Date("2026-09-15T10:00:00.000Z");
    const result = createDiagnosticResult("new", fixedDate);
    expect(result.outcome).toBe("new");
    expect(result.completedAt).toEqual(fixedDate);
  });

  it("creates a result for 'familiar' outcome", () => {
    const fixedDate = new Date("2026-09-15T10:00:00.000Z");
    const result = createDiagnosticResult("familiar", fixedDate);
    expect(result.outcome).toBe("familiar");
    expect(result.completedAt).toEqual(fixedDate);
  });

  it("creates a result for 'experienced' outcome", () => {
    const fixedDate = new Date("2026-09-15T10:00:00.000Z");
    const result = createDiagnosticResult("experienced", fixedDate);
    expect(result.outcome).toBe("experienced");
    expect(result.completedAt).toEqual(fixedDate);
  });

  it("falls back to 'familiar' for invalid or unknown outcome strings", () => {
    const fixedDate = new Date("2026-09-15T10:00:00.000Z");
    const result = createDiagnosticResult("unknown_outcome", fixedDate);
    expect(result.outcome).toBe("familiar");
    expect(result.completedAt).toEqual(fixedDate);
  });

  it("falls back to 'familiar' for non-string outcomes", () => {
    const result = createDiagnosticResult(null);
    expect(result.outcome).toBe("familiar");
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it("defaults completedAt to now when omitted", () => {
    const before = Date.now();
    const result = createDiagnosticResult("new");
    const after = Date.now();
    expect(result.outcome).toBe("new");
    expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.completedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("falls back to current date when completedAt is invalid Date", () => {
    const invalidDate = new Date("invalid-date-string");
    const before = Date.now();
    const result = createDiagnosticResult("experienced", invalidDate);
    const after = Date.now();
    expect(result.outcome).toBe("experienced");
    expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.completedAt.getTime()).toBeLessThanOrEqual(after);
  });
});
