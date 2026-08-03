import { Result } from "@/domain/shared/Result";

/**
 * `LiveClass` domain entity.
 *
 * Represents a scheduled live class session associated with a course.
 * Immutable — updates produce new instances via `updateLiveClass`.
 */

export type LiveClassStatus = "scheduled" | "cancelled" | "completed";

const ALL_LIVE_CLASS_STATUSES: readonly LiveClassStatus[] = ["scheduled", "cancelled", "completed"];

/**
 * Type guard for a value read back from persistence. A repository
 * adapter should call this before trusting a stored string as a
 * `LiveClassStatus`. A corrupt or legacy row must not silently
 * hydrate an invalid status.
 */
export function isValidLiveClassStatus(s: string): s is LiveClassStatus {
  return (ALL_LIVE_CLASS_STATUSES as readonly string[]).includes(s);
}

export interface LiveClass {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly scheduledAt: Date;
  readonly durationMinutes: number;
  readonly instructorId: string;
  readonly meetingUrl: string;
  readonly status: LiveClassStatus;
  /** Set once the class has happened and a recording is posted. Null until then. */
  readonly recordingUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateLiveClassInput {
  id: string;
  courseId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  instructorId: string;
  meetingUrl: string;
  status: LiveClassStatus;
}

export type UpdateLiveClassPatch = Partial<
  Pick<LiveClass, "title" | "scheduledAt" | "durationMinutes" | "meetingUrl" | "status">
> & {
  /** Pass a URL to set/replace, an empty string to clear, or omit to leave unchanged. */
  recordingUrl?: string | null;
};

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type LiveClassError =
  | { kind: "invalid_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_scheduled_at" }
  | { kind: "invalid_duration" }
  | { kind: "invalid_meeting_url" }
  | { kind: "invalid_status" }
  | { kind: "invalid_recording_url" };

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLiveClass(input: CreateLiveClassInput): Result<LiveClass, LiveClassError> {
  const errors: LiveClassError[] = [];

  if (!input.id.trim()) {
    errors.push({ kind: "invalid_id" });
  }
  if (!input.title.trim()) {
    errors.push({ kind: "invalid_title" });
  }
  if (input.scheduledAt <= new Date()) {
    errors.push({ kind: "invalid_scheduled_at" });
  }
  if (input.durationMinutes <= 0) {
    errors.push({ kind: "invalid_duration" });
  }
  if (!isValidUrl(input.meetingUrl)) {
    errors.push({ kind: "invalid_meeting_url" });
  }
  if (!["scheduled", "cancelled", "completed"].includes(input.status)) {
    errors.push({ kind: "invalid_status" });
  }

  if (errors.length > 0) return { ok: false, error: errors[0]! };

  const now = new Date();
  return {
    ok: true,
    value: Object.freeze({
      id: input.id.trim(),
      courseId: input.courseId.trim(),
      title: input.title.trim(),
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes,
      instructorId: input.instructorId.trim(),
      meetingUrl: input.meetingUrl.trim(),
      status: input.status,
      recordingUrl: null,
      createdAt: now,
      updatedAt: now,
    }),
  };
}

export function updateLiveClass(
  original: LiveClass,
  patch: UpdateLiveClassPatch,
): Result<LiveClass, LiveClassError> {
  const errors: LiveClassError[] = [];

  const title = patch.title !== undefined ? patch.title.trim() : original.title;
  if (!title) errors.push({ kind: "invalid_title" });

  const scheduledAt = patch.scheduledAt !== undefined ? patch.scheduledAt : original.scheduledAt;
  if (scheduledAt <= new Date()) {
    // Allow past dates only if transitioning to "completed" (backfill)
    if (patch.status !== "completed") {
      errors.push({ kind: "invalid_scheduled_at" });
    }
  }

  const durationMinutes =
    patch.durationMinutes !== undefined ? patch.durationMinutes : original.durationMinutes;
  if (durationMinutes <= 0) errors.push({ kind: "invalid_duration" });

  const meetingUrl = patch.meetingUrl !== undefined ? patch.meetingUrl : original.meetingUrl;
  if (!isValidUrl(meetingUrl)) errors.push({ kind: "invalid_meeting_url" });

  const status = patch.status !== undefined ? patch.status : original.status;
  if (!["scheduled", "cancelled", "completed"].includes(status)) {
    errors.push({ kind: "invalid_status" });
  }

  let recordingUrl = original.recordingUrl;
  if (patch.recordingUrl !== undefined) {
    const trimmed = patch.recordingUrl?.trim() ?? "";
    if (!trimmed) {
      recordingUrl = null;
    } else if (!isValidUrl(trimmed)) {
      errors.push({ kind: "invalid_recording_url" });
    } else {
      recordingUrl = trimmed;
    }
  }

  if (errors.length > 0) return { ok: false, error: errors[0]! };

  return {
    ok: true,
    value: Object.freeze({
      ...original,
      title,
      scheduledAt: new Date(scheduledAt),
      durationMinutes,
      meetingUrl,
      status,
      recordingUrl,
      updatedAt: new Date(),
    }),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
