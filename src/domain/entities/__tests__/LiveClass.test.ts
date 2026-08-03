import { describe, it, expect } from "vitest";
import { createLiveClass, updateLiveClass, isValidLiveClassStatus } from "../LiveClass";

describe("LiveClass entity", () => {
  // Use a far-future date so the test stays valid regardless of when
  // CI runs it. `createLiveClass` rejects any date that is now-or-in-the
  // past; the original `2026-08-01T10:00:00Z` was valid at the time the
  // test was authored but is no longer.
  const baseInput = {
    id: "lc_1",
    courseId: "course_1",
    title: "Advanced PPC Strategies",
    scheduledAt: new Date("2099-08-01T10:00:00Z"),
    durationMinutes: 60,
    instructorId: "user_instructor_1",
    meetingUrl: "https://zoom.us/j/123456",
    status: "scheduled" as const,
  };

  describe("createLiveClass", () => {
    it("creates a scheduled live class with all fields", () => {
      const r = createLiveClass(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const lc = r.value;
      expect(lc.id).toBe("lc_1");
      expect(lc.courseId).toBe("course_1");
      expect(lc.title).toBe("Advanced PPC Strategies");
      expect(lc.scheduledAt).toEqual(new Date("2099-08-01T10:00:00Z"));
      expect(lc.durationMinutes).toBe(60);
      expect(lc.instructorId).toBe("user_instructor_1");
      expect(lc.meetingUrl).toBe("https://zoom.us/j/123456");
      expect(lc.status).toBe("scheduled");
      expect(lc.recordingUrl).toBeNull();
      expect(lc.createdAt).toBeInstanceOf(Date);
      expect(lc.updatedAt).toBeInstanceOf(Date);
    });

    it("creates a cancelled live class", () => {
      const r = createLiveClass({ ...baseInput, status: "cancelled" as const });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.status).toBe("cancelled");
    });

    it("fails when scheduledAt is in the past", () => {
      const r = createLiveClass({
        ...baseInput,
        id: "lc_past",
        scheduledAt: new Date("2020-01-01T10:00:00Z"),
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_scheduled_at");
    });

    it("fails when id is empty", () => {
      const r = createLiveClass({ ...baseInput, id: "" });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_id");
    });

    it("fails when title is empty", () => {
      const r = createLiveClass({ ...baseInput, title: "   " });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_title");
    });

    it("fails when durationMinutes is <= 0", () => {
      const r = createLiveClass({ ...baseInput, durationMinutes: 0 });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_duration");
    });

    it("fails when meetingUrl is not a valid URL", () => {
      const r = createLiveClass({ ...baseInput, meetingUrl: "not-a-url" });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_meeting_url");
    });

    it("returns an immutable live class object", () => {
      const r = createLiveClass(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const lc = r.value;
      expect(() => {
        (lc as unknown as Record<string, unknown>).title = "Hacked";
      }).toThrow();
    });
  });

  describe("updateLiveClass", () => {
    it("updates allowed fields and returns a new instance", () => {
      const r = createLiveClass(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const original = r.value;

      const updated = updateLiveClass(original, {
        title: "New Title",
        status: "cancelled",
      });

      expect(updated.ok).toBe(true);
      if (!updated.ok) return;
      expect(updated.value.title).toBe("New Title");
      expect(updated.value.status).toBe("cancelled");
      expect(updated.value.courseId).toBe(original.courseId);
      expect(updated.value.id).toBe(original.id);
      expect(updated.value.scheduledAt.getTime()).toBe(original.scheduledAt.getTime());
      expect(updated.value.updatedAt.getTime()).toBeGreaterThanOrEqual(
        original.updatedAt.getTime(),
      );
    });

    it("fails when updated scheduledAt is in the past", () => {
      const r = createLiveClass(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;

      const updated = updateLiveClass(r.value, {
        scheduledAt: new Date("2020-01-01T10:00:00Z"),
      });
      expect(updated.ok).toBe(false);
      if (updated.ok) return;
      expect(updated.error.kind).toBe("invalid_scheduled_at");
    });

    it("fails when updated title is empty", () => {
      const r = createLiveClass(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;

      const updated = updateLiveClass(r.value, { title: "" });
      expect(updated.ok).toBe(false);
      if (updated.ok) return;
      expect(updated.error.kind).toBe("invalid_title");
    });

    it("sets recordingUrl when a valid URL is patched in", () => {
      const r = createLiveClass(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;

      const updated = updateLiveClass(r.value, {
        recordingUrl: "https://vimeo.com/12345",
      });
      expect(updated.ok).toBe(true);
      if (!updated.ok) return;
      expect(updated.value.recordingUrl).toBe("https://vimeo.com/12345");
    });

    it("clears recordingUrl when patched with an empty string", () => {
      const r = createLiveClass(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const withRecording = updateLiveClass(r.value, {
        recordingUrl: "https://vimeo.com/12345",
      });
      expect(withRecording.ok).toBe(true);
      if (!withRecording.ok) return;

      const cleared = updateLiveClass(withRecording.value, { recordingUrl: "" });
      expect(cleared.ok).toBe(true);
      if (!cleared.ok) return;
      expect(cleared.value.recordingUrl).toBeNull();
    });

    it("leaves recordingUrl unchanged when omitted from the patch", () => {
      const r = createLiveClass(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const withRecording = updateLiveClass(r.value, {
        recordingUrl: "https://vimeo.com/12345",
      });
      expect(withRecording.ok).toBe(true);
      if (!withRecording.ok) return;

      const updated = updateLiveClass(withRecording.value, { title: "Retitled" });
      expect(updated.ok).toBe(true);
      if (!updated.ok) return;
      expect(updated.value.recordingUrl).toBe("https://vimeo.com/12345");
    });

    it("fails when recordingUrl is not a valid URL", () => {
      const r = createLiveClass(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;

      const updated = updateLiveClass(r.value, { recordingUrl: "not-a-url" });
      expect(updated.ok).toBe(false);
      if (updated.ok) return;
      expect(updated.error.kind).toBe("invalid_recording_url");
    });
  });

  describe("isValidLiveClassStatus()", () => {
    it.each(["scheduled", "cancelled", "completed"])("returns true for %s", (status) => {
      expect(isValidLiveClassStatus(status)).toBe(true);
    });

    it("returns false for a legacy or corrupt value", () => {
      expect(isValidLiveClassStatus("SOME_LEGACY_VALUE")).toBe(false);
    });

    it("returns false for an empty string", () => {
      expect(isValidLiveClassStatus("")).toBe(false);
    });
  });
});
