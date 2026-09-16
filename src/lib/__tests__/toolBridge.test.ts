import { describe, expect, it } from "vitest";
import {
  validateToolBridges,
  type BridgeLessonRef,
  type BridgeTierAllowlist,
} from "@/lib/toolBridge";

const tiers: readonly BridgeTierAllowlist[] = [
  { tier: "pp-foundations", simulatorTargets: ["bid-elevator", "campaign-builder"] },
  {
    tier: "accelerated-mastery",
    simulatorTargets: ["bid-elevator", "campaign-builder", "str-triage"],
  },
];

const happyLesson = (slug: string, target: string): BridgeLessonRef => ({
  slug,
  toolBridge: { kind: "simulator", target },
});

describe("validateToolBridges", () => {
  it("returns no errors when every bridge is registered, published, and tier-included", () => {
    const errors = validateToolBridges({
      registeredSimulatorIds: ["bid-elevator", "campaign-builder", "str-triage"],
      publishedSimulatorKeys: ["bid-elevator", "campaign-builder", "str-triage"],
      lessons: [
        happyLesson("2.2-keyword-research-workflow", "campaign-builder"),
        happyLesson("6.3-bid-elevator-prep", "bid-elevator"),
        { slug: "0.1-welcome", toolBridge: { kind: "none" } },
      ],
      tiers,
    });
    expect(errors).toEqual([]);
  });

  it("reports a lesson pointing at an unregistered simulator", () => {
    const errors = validateToolBridges({
      registeredSimulatorIds: ["bid-elevator"],
      publishedSimulatorKeys: ["bid-elevator"],
      lessons: [happyLesson("3.1-listing-quality-score", "listing-audit")],
      tiers: [{ tier: "pp-foundations", simulatorTargets: ["bid-elevator", "listing-audit"] }],
    });
    expect(errors).toContainEqual({
      kind: "bridge_target_not_registered",
      slug: "3.1-listing-quality-score",
      target: "listing-audit",
    });
  });

  it("reports a bridge whose target is not in any tier", () => {
    const errors = validateToolBridges({
      registeredSimulatorIds: ["bid-elevator"],
      publishedSimulatorKeys: ["bid-elevator"],
      lessons: [happyLesson("6.3-bid-elevator-prep", "bid-elevator")],
      tiers: [{ tier: "pp-foundations", simulatorTargets: ["campaign-builder"] }],
    });
    expect(errors).toContainEqual({
      kind: "bridge_target_not_in_any_tier",
      slug: "6.3-bid-elevator-prep",
      target: "bid-elevator",
    });
  });

  it("reports a bridge whose target has no published scenario", () => {
    const errors = validateToolBridges({
      registeredSimulatorIds: ["bid-elevator"],
      publishedSimulatorKeys: ["other-simulator"],
      lessons: [happyLesson("6.3-bid-elevator-prep", "bid-elevator")],
      tiers,
    });
    expect(errors).toContainEqual({
      kind: "bridge_target_unpublished",
      slug: "6.3-bid-elevator-prep",
      target: "bid-elevator",
    });
  });

  it("reports a registered simulator that no tier unlocks", () => {
    const errors = validateToolBridges({
      registeredSimulatorIds: ["bid-elevator", "str-triage"],
      publishedSimulatorKeys: ["bid-elevator", "str-triage"],
      lessons: [],
      tiers: [{ tier: "pp-foundations", simulatorTargets: ["bid-elevator"] }],
    });
    expect(errors).toContainEqual({
      kind: "registered_simulator_unreachable",
      simulatorId: "str-triage",
    });
  });

  it("skips the published-scenario check when the published list is empty", () => {
    const errors = validateToolBridges({
      registeredSimulatorIds: ["bid-elevator"],
      publishedSimulatorKeys: [],
      lessons: [happyLesson("6.3-bid-elevator-prep", "bid-elevator")],
      tiers,
    });
    expect(errors).toEqual([]);
  });
});
