import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ADMIN_ACTIONS = [
  "adminGrantSubscription",
  "adminSetEnrollmentStatus",
  "archiveBadge",
  "archiveCourse",
  "archiveDiscountCode",
  "archiveSimulatorScenario",
  "createBadge",
  "createCourse",
  "createDiscountCode",
  "createLesson",
  "createLiveClass",
  "createModule",
  "createQuiz",
  "createResource",
  "createScenarioVersionDraft",
  "createSimulatorScenario",
  "deleteLesson",
  "deleteLiveClass",
  "deleteModule",
  "deleteQuiz",
  "deleteResource",
  "getQuiz",
  "impersonateUser",
  "listAuditLogs",
  "listQuizzes",
  "listRefundRequests",
  "processRefund",
  "processRefundRequest",
  "publishSimulatorScenario",
  "purgeResource",
  "reorderLessons",
  "reorderModules",
  "revokeCertificate",
  "stopImpersonating",
  "twoFactor",
  "updateBadge",
  "updateCourse",
  "updateDiscountCode",
  "updateEmailTemplate",
  "updateLesson",
  "updateLiveClass",
  "updateModule",
  "updateQuiz",
  "updateResource",
  "updateSimulatorScenario",
] as const;

describe("admin action coverage inventory", () => {
  it("keeps every admin action module represented by a boundary test", () => {
    const testDirectory = new URL("./", import.meta.url);
    const testSource = readdirSync(testDirectory)
      .filter((name) => name.endsWith(".test.ts") || name.endsWith(".test.tsx"))
      .map((name) => readFileSync(new URL(name, testDirectory), "utf8"))
      .join("\n");

    for (const action of ADMIN_ACTIONS) {
      expect(testSource, `${action}.action.ts has no boundary test`).toMatch(
        new RegExp(`(?:\\.\\./|@/app/actions/)${action}\\.action`),
      );
    }
  });
});
