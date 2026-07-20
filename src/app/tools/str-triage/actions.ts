/**
 * STR Triage — server action.
 *
 * Runs the StrTriageSimulator on user-classified rows and returns
 * the grading result.
 */

"use server";

import { buildContainer } from "@/composition/container";
import type { StrTriageInput } from "@/domain/simulator/str-triage/StrTriageInput";
import type {
  StrTriageOutput,
  TriageAction,
} from "@/domain/simulator/str-triage/StrTriageOutput";

export type ClassifyStrRow = {
  keyword: string;
  spend: number;
  revenue: number;
  orders: number;
  action: TriageAction;
};

export type ClassifyStrInput = {
  rows: ReadonlyArray<ClassifyStrRow>;
  targetRoas: number;
};

export type ClassifyStrResult =
  | { ok: true; value: StrTriageOutput }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

const VALID_ACTIONS: ReadonlyArray<TriageAction> = [
  "keep",
  "pause",
  "add_as_exact",
  "add_as_phrase",
];

export async function classifyStr(
  input: ClassifyStrInput,
): Promise<ClassifyStrResult> {
  if (
    !input ||
    !Array.isArray(input.rows) ||
    input.rows.length === 0 ||
    typeof input.targetRoas !== "number" ||
    input.targetRoas <= 0
  ) {
    return {
      ok: false,
      error: { kind: "invalid_input", message: "Need ≥1 row, target ROAS > 0" },
    };
  }
  for (const r of input.rows) {
    if (
      typeof r.keyword !== "string" ||
      typeof r.spend !== "number" ||
      r.spend < 0 ||
      typeof r.revenue !== "number" ||
      r.revenue < 0 ||
      typeof r.orders !== "number" ||
      r.orders < 0 ||
      !VALID_ACTIONS.includes(r.action)
    ) {
      return {
        ok: false,
        error: { kind: "invalid_input", message: `Bad row: ${JSON.stringify(r)}` },
      };
    }
  }

  const container = buildContainer();
  const sim = container.simulatorRegistry.get("str-triage");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "STR Triage simulator not registered" },
    };
  }

  const domainInput: StrTriageInput = {
    rows: input.rows.map((r) => ({
      keyword: r.keyword,
      spend: r.spend,
      revenue: r.revenue,
      orders: r.orders,
    })),
    targetRoas: input.targetRoas,
  };
  try {
    const output = (await sim.run(domainInput)) as StrTriageOutput;
    return { ok: true, value: output };
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "engine_error",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
