/**
 * EmailTemplate.test.ts — STORY-063.
 *
 * Covers the createEmailTemplate and updateEmailTemplate factories
 * (immutability, validation, patch semantics).
 */

import { describe, it, expect } from "vitest";
import {
  createEmailTemplate,
  updateEmailTemplate,
  isEmailTemplateType,
  EMAIL_TEMPLATE_TYPES,
} from "@/domain/entities/EmailTemplate";

const VALID_PARAMS = {
  id: "et_1",
  type: "email_verification" as const,
  subject: "Verify your email",
  headline: "Confirm your email address",
  introBody: "Click the button below to verify your email.",
  ctaLabel: "Verify Email",
  updatedById: "admin_1",
};

describe("EmailTemplate — isEmailTemplateType", () => {
  it("accepts every known template type", () => {
    for (const t of EMAIL_TEMPLATE_TYPES) {
      expect(isEmailTemplateType(t)).toBe(true);
    }
  });

  it("rejects unknown types", () => {
    expect(isEmailTemplateType("not_a_real_type")).toBe(false);
    expect(isEmailTemplateType("")).toBe(false);
  });
});

describe("createEmailTemplate", () => {
  it("creates a valid template on the happy path", () => {
    const r = createEmailTemplate(VALID_PARAMS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.id).toBe("et_1");
    expect(r.value.type).toBe("email_verification");
    expect(r.value.subject).toBe("Verify your email");
    expect(r.value.headline).toBe("Confirm your email address");
    expect(r.value.introBody).toBe("Click the button below to verify your email.");
    expect(r.value.ctaLabel).toBe("Verify Email");
    expect(r.value.updatedById).toBe("admin_1");
  });

  it("trims leading and trailing whitespace from text fields", () => {
    const r = createEmailTemplate({
      ...VALID_PARAMS,
      subject: "  Verify your email  ",
      headline: "\tHeadline\n",
      introBody: "  intro  ",
      ctaLabel: "  Verify  ",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.subject).toBe("Verify your email");
    expect(r.value.headline).toBe("Headline");
    expect(r.value.introBody).toBe("intro");
    expect(r.value.ctaLabel).toBe("Verify");
  });

  it("freezes the returned object", () => {
    const r = createEmailTemplate(VALID_PARAMS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.isFrozen(r.value)).toBe(true);
  });

  it("rejects empty id", () => {
    const r = createEmailTemplate({ ...VALID_PARAMS, id: "  " });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("rejects empty updatedById", () => {
    const r = createEmailTemplate({ ...VALID_PARAMS, updatedById: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/updatedById/);
  });

  it("rejects empty subject", () => {
    const r = createEmailTemplate({ ...VALID_PARAMS, subject: "   " });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/subject/);
  });

  it("rejects empty headline", () => {
    const r = createEmailTemplate({ ...VALID_PARAMS, headline: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/headline/);
  });

  it("rejects empty introBody", () => {
    const r = createEmailTemplate({ ...VALID_PARAMS, introBody: " " });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/introBody/);
  });

  it("rejects empty ctaLabel", () => {
    const r = createEmailTemplate({ ...VALID_PARAMS, ctaLabel: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/ctaLabel/);
  });

  it("uses provided updatedAt when supplied", () => {
    const ts = new Date("2026-07-20T12:00:00Z");
    const r = createEmailTemplate({ ...VALID_PARAMS, updatedAt: ts });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.updatedAt).toEqual(ts);
  });
});

describe("updateEmailTemplate", () => {
  const baseDate = new Date("2026-07-20T00:00:00Z");
  const newDate = new Date("2026-07-22T00:00:00Z");

  function makeTemplate() {
    const r = createEmailTemplate({
      ...VALID_PARAMS,
      updatedAt: baseDate,
    });
    if (!r.ok) throw new Error("seed failed");
    return r.value;
  }

  it("returns a new instance with patched fields", () => {
    const original = makeTemplate();
    const r = updateEmailTemplate(original, { subject: "New subject" }, "admin_2", newDate);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.subject).toBe("New subject");
    // Untouched fields preserved
    expect(r.value.headline).toBe(original.headline);
    expect(r.value.introBody).toBe(original.introBody);
    expect(r.value.ctaLabel).toBe(original.ctaLabel);
    expect(r.value.id).toBe(original.id);
    expect(r.value.type).toBe(original.type);
  });

  it("updates updatedById and updatedAt", () => {
    const original = makeTemplate();
    const r = updateEmailTemplate(original, { headline: "New headline" }, "admin_3", newDate);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.updatedById).toBe("admin_3");
    expect(r.value.updatedAt).toEqual(newDate);
  });

  it("trims whitespace from patched fields", () => {
    const original = makeTemplate();
    const r = updateEmailTemplate(original, { subject: "  Patched subject  " }, "admin_2", newDate);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.subject).toBe("Patched subject");
  });

  it("freezes the new instance", () => {
    const original = makeTemplate();
    const r = updateEmailTemplate(original, {}, "admin_2", newDate);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.isFrozen(r.value)).toBe(true);
  });

  it("rejects empty updatedById", () => {
    const original = makeTemplate();
    const r = updateEmailTemplate(original, { subject: "X" }, "   ", newDate);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/updatedById/);
  });

  it("rejects empty subject via patch", () => {
    const original = makeTemplate();
    const r = updateEmailTemplate(original, { subject: "  " }, "admin_2", newDate);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/subject/);
  });

  it("rejects empty headline via patch", () => {
    const original = makeTemplate();
    const r = updateEmailTemplate(original, { headline: "" }, "admin_2", newDate);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/headline/);
  });

  it("rejects empty introBody via patch", () => {
    const original = makeTemplate();
    const r = updateEmailTemplate(original, { introBody: "" }, "admin_2", newDate);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/introBody/);
  });

  it("rejects empty ctaLabel via patch", () => {
    const original = makeTemplate();
    const r = updateEmailTemplate(original, { ctaLabel: "  " }, "admin_2", newDate);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/ctaLabel/);
  });

  it("does not mutate the original instance", () => {
    const original = makeTemplate();
    const originalSubject = original.subject;
    updateEmailTemplate(original, { subject: "Changed" }, "admin_2", newDate);
    expect(original.subject).toBe(originalSubject);
  });
});
