import { describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";
import { buildTestContainer } from "@/composition/container.test";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}));

import { performArchiveCourse } from "../archiveCourse.action";
import { performArchiveSimulatorScenario } from "../archiveSimulatorScenario.action";
import { performCreateCourse } from "../createCourse.action";
import { performCreateLesson } from "../createLesson.action";
import { performCreateModule } from "../createModule.action";
import { performCreateScenarioVersionDraft } from "../createScenarioVersionDraft.action";
import { performCreateSimulatorScenario } from "../createSimulatorScenario.action";
import { performDeleteLesson } from "../deleteLesson.action";
import { performDeleteModule } from "../deleteModule.action";
import { performProcessRefund } from "../processRefund.action";
import { performPublishSimulatorScenario } from "../publishSimulatorScenario.action";
import { performReorderLessons } from "../reorderLessons.action";
import { performReorderModules } from "../reorderModules.action";
import { performUpdateCourse } from "../updateCourse.action";
import { performUpdateLesson } from "../updateLesson.action";
import { performUpdateModule } from "../updateModule.action";
import { performUpdateSimulatorScenario } from "../updateSimulatorScenario.action";

const adminId = async () => "admin-1";
const noAdmin = async () => null;

describe("admin pure action workflows", () => {
  it("guards and delegates course archive/create/update actions", async () => {
    const unauthorized = await performCreateCourse(buildTestContainer(), {} as never, noAdmin);
    expect(unauthorized).toEqual({ ok: false, error: { kind: "unauthorized" } });

    const container = buildTestContainer();
    const execute = vi.fn().mockResolvedValue(Result.ok({ course: { id: "course-1" }, wasAlreadyArchived: false }));
    container.archiveCourse.execute = execute as unknown as typeof container.archiveCourse.execute;
    expect(await performArchiveCourse(container, { courseId: "course-1" }, adminId)).toEqual({ ok: true, value: { courseId: "course-1", wasAlreadyArchived: false } });
    expect(execute).toHaveBeenCalledWith({ courseId: "course-1", actorId: "admin-1" });

    const create = vi.fn().mockResolvedValue(Result.ok({ course: { id: "course-2" } }));
    container.createCourse.execute = create as unknown as typeof container.createCourse.execute;
    expect(await performCreateCourse(container, { slug: "course-2" } as never, adminId)).toEqual({ ok: true, value: { courseId: "course-2" } });
    expect(create).toHaveBeenCalledWith({ slug: "course-2", actorId: "admin-1" });

    const update = vi.fn().mockResolvedValue(Result.ok({ course: { id: "course-3" } }));
    container.updateCourse.execute = update as unknown as typeof container.updateCourse.execute;
    expect(await performUpdateCourse(container, { courseId: "course-3", patch: { title: "Updated" } } as never, adminId)).toEqual({ ok: true, value: { courseId: "course-3" } });
    expect(update).toHaveBeenCalledWith({ courseId: "course-3", patch: { title: "Updated" }, actorId: "admin-1" });
  });

  it("parses lesson content and covers module/lesson mutations", async () => {
    const container = buildTestContainer();
    const createLesson = vi.fn().mockResolvedValue(Result.ok({ lesson: { id: "lesson-1" } }));
    container.createLesson.execute = createLesson as unknown as typeof container.createLesson.execute;
    expect(await performCreateLesson(container, { moduleId: "module-1", title: "Video", type: "VIDEO", contentJson: '{"durationMinutes":"12"}' }, adminId)).toEqual({ ok: true, value: { lessonId: "lesson-1" } });
    expect(createLesson).toHaveBeenCalledWith({ moduleId: "module-1", title: "Video", type: "VIDEO", content: { durationMinutes: 12 }, actorId: "admin-1" });

    expect(await performCreateLesson(container, { moduleId: "module-1", title: "Bad", type: "TEXT", contentJson: "{" }, adminId)).toMatchObject({ ok: false, error: { kind: "invalid_content_json" } });

    const createModule = vi.fn().mockResolvedValue(Result.ok({ module: { id: "module-1" } }));
    container.createModule.execute = createModule as unknown as typeof container.createModule.execute;
    expect(await performCreateModule(container, { courseId: "course-1", title: "Module 1" }, adminId)).toEqual({ ok: true, value: { moduleId: "module-1" } });
    expect(createModule).toHaveBeenCalledWith({ courseId: "course-1", title: "Module 1", actorId: "admin-1" });

    const deleteLesson = vi.fn().mockResolvedValue(Result.ok({ deleted: true }));
    container.deleteLesson.execute = deleteLesson as unknown as typeof container.deleteLesson.execute;
    expect(await performDeleteLesson(container, { lessonId: "lesson-1" }, adminId)).toEqual({ ok: true, value: { deleted: true } });
    expect(deleteLesson).toHaveBeenCalledWith({ lessonId: "lesson-1", actorId: "admin-1" });

    const deleteModule = vi.fn().mockResolvedValue(Result.ok({ deleted: true }));
    container.deleteModule.execute = deleteModule as unknown as typeof container.deleteModule.execute;
    expect(await performDeleteModule(container, { moduleId: "module-1" }, adminId)).toEqual({ ok: true, value: { deleted: true } });
    expect(deleteModule).toHaveBeenCalledWith({ moduleId: "module-1", actorId: "admin-1" });

    const updateLesson = vi.fn().mockResolvedValue(Result.ok({ lesson: { id: "lesson-1" } }));
    container.updateLesson.execute = updateLesson as unknown as typeof container.updateLesson.execute;
    expect(await performUpdateLesson(container, { lessonId: "lesson-1", type: "TEXT", title: "Updated", contentJson: "{\"body\":\"hello\"}" }, adminId)).toEqual({ ok: true, value: { lessonId: "lesson-1" } });
    expect(updateLesson).toHaveBeenCalledWith({ lessonId: "lesson-1", patch: { title: "Updated", type: "TEXT", content: { body: "hello" } }, actorId: "admin-1" });

    const updateModule = vi.fn().mockResolvedValue(Result.ok({ module: { id: "module-1" } }));
    container.updateModule.execute = updateModule as unknown as typeof container.updateModule.execute;
    expect(await performUpdateModule(container, { moduleId: "module-1", patch: { title: "Updated" } }, adminId)).toEqual({ ok: true, value: { moduleId: "module-1" } });
    expect(updateModule).toHaveBeenCalledWith({ moduleId: "module-1", patch: { title: "Updated" }, actorId: "admin-1" });
  });

  it("covers simulator scenario lifecycle actions", async () => {
    const container = buildTestContainer();
    const scenario = { id: "scenario-1" };
    const archive = vi.fn().mockResolvedValue(Result.ok({ wasAlreadyArchived: false }));
    container.archiveSimulatorScenario.execute = archive as unknown as typeof container.archiveSimulatorScenario.execute;
    expect(await performArchiveSimulatorScenario(container, { id: "scenario-1" }, adminId)).toEqual({ ok: true, value: { scenarioId: "scenario-1" } });
    expect(archive).toHaveBeenCalledWith({ id: "scenario-1", actorId: "admin-1" });

    const create = vi.fn().mockResolvedValue(Result.ok({ scenario }));
    container.createSimulatorScenario.execute = create as unknown as typeof container.createSimulatorScenario.execute;
    expect(await performCreateSimulatorScenario(container, { id: "scenario-1", simulatorId: "cashflow", name: "Cashflow", description: "Practice", inputSchema: {}, outputSchema: {}, difficulty: "beginner", estimatedMinutes: 10 } as never, adminId)).toEqual({ ok: true, value: { scenarioId: "scenario-1" } });
    expect(create).toHaveBeenCalledWith({ id: "scenario-1", simulatorId: "cashflow", name: "Cashflow", description: "Practice", inputSchema: {}, outputSchema: {}, difficulty: "beginner", estimatedMinutes: 10, actorId: "admin-1" });

    const draft = vi.fn().mockResolvedValue(Result.ok({ scenario }));
    container.createScenarioVersionDraft.execute = draft as unknown as typeof container.createScenarioVersionDraft.execute;
    expect(await performCreateScenarioVersionDraft(container, { sourceId: "scenario-0" }, adminId)).toEqual({ ok: true, value: { scenarioId: "scenario-1" } });
    expect(draft).toHaveBeenCalledWith({ sourceId: "scenario-0", actorId: "admin-1" });

    const publish = vi.fn().mockResolvedValue(Result.ok({ scenario }));
    container.publishSimulatorScenario.execute = publish as unknown as typeof container.publishSimulatorScenario.execute;
    expect(await performPublishSimulatorScenario(container, { id: "scenario-1" }, adminId)).toEqual({ ok: true, value: { scenarioId: "scenario-1" } });
    expect(publish).toHaveBeenCalledWith({ id: "scenario-1", actorId: "admin-1" });

    const update = vi.fn().mockResolvedValue(Result.ok({ scenario }));
    container.updateSimulatorScenario.execute = update as unknown as typeof container.updateSimulatorScenario.execute;
    const input = { id: "scenario-1", simulatorId: "cashflow", name: "Updated", description: "Practice", inputSchema: {}, outputSchema: {}, difficulty: "beginner", estimatedMinutes: 10 };
    expect(await performUpdateSimulatorScenario(container, input as never, adminId)).toEqual({ ok: true, value: { scenarioId: "scenario-1" } });
    expect(update).toHaveBeenCalledWith({ ...input, actorId: "admin-1" });
  });

  it("passes actor ids through reorder actions and both refund paths", async () => {
    const container = buildTestContainer();
    const reorderLessons = vi.fn().mockResolvedValue(Result.ok({ lessons: [{ id: "lesson-2" }, { id: "lesson-1" }] }));
    container.reorderLessons.execute = reorderLessons as unknown as typeof container.reorderLessons.execute;
    expect(await performReorderLessons(container, { moduleId: "module-1", lessonIds: ["lesson-2", "lesson-1"] }, adminId)).toEqual({ ok: true, value: { lessons: [{ id: "lesson-2" }, { id: "lesson-1" }] } });
    expect(reorderLessons).toHaveBeenCalledWith({ moduleId: "module-1", lessonIds: ["lesson-2", "lesson-1"], actorId: "admin-1" });

    const reorderModules = vi.fn().mockResolvedValue(Result.ok({ modules: [{ id: "module-2" }, { id: "module-1" }] }));
    container.reorderModules.execute = reorderModules as unknown as typeof container.reorderModules.execute;
    expect(await performReorderModules(container, { courseId: "course-1", moduleIds: ["module-2", "module-1"] }, adminId)).toEqual({ ok: true, value: { modules: [{ id: "module-2" }, { id: "module-1" }] } });
    expect(reorderModules).toHaveBeenCalledWith({ courseId: "course-1", moduleIds: ["module-2", "module-1"], actorId: "admin-1" });

    const processRefund = vi.fn().mockResolvedValue(Result.ok({ refundId: "refund-1" }));
    container.processRefund.execute = processRefund as unknown as typeof container.processRefund.execute;
    const standard = { orderId: "order-1", amountMinor: 1000, reason: "duplicate", override: false, overrideReason: "" };
    expect(await performProcessRefund(container, standard, adminId)).toEqual({ ok: true, value: { orderId: "order-1", refundId: "refund-1" } });
    expect(processRefund).toHaveBeenCalledWith({ orderId: "order-1", amountMinor: 1000, reason: "duplicate" });

    const override = vi.fn().mockResolvedValue(Result.ok({ refundId: "refund-2" }));
    container.refundOverride.execute = override as unknown as typeof container.refundOverride.execute;
    const overrideInput = { ...standard, override: true, overrideReason: "Finance approved" };
    expect(await performProcessRefund(container, overrideInput, adminId)).toEqual({ ok: true, value: { orderId: "order-1", refundId: "refund-2" } });
    expect(override).toHaveBeenCalledWith({ orderId: "order-1", actorId: "admin-1", amountMinor: 1000, reason: "duplicate", overrideReason: "Finance approved" });
    expect(await performProcessRefund(container, standard, noAdmin)).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });
});
