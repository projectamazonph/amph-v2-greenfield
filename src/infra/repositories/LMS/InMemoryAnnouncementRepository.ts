/**
 * InMemoryAnnouncementRepository - fake for tests.
 */

import type { AnnouncementRepository, AnnouncementError } from "@/ports/repositories/LMS/AnnouncementRepository";
import type { Announcement } from "@/domain/entities/LMS/Announcement";
import { Result } from "@/domain/shared/Result";

export class InMemoryAnnouncementRepository implements AnnouncementRepository {
  private announcements = new Map<string, Announcement>();
  private dismissed = new Set<string>(); // announcementId:userId pairs

  async getActive(): Promise<Result<readonly Announcement[], AnnouncementError>> {
    const now = new Date();
    const active = Array.from(this.announcements.values()).filter((a) => {
      if (!a.isActive) return false;
      if (a.startAt && a.startAt > now) return false;
      if (a.endAt && a.endAt < now) return false;
      return true;
    });
    return Result.ok(active);
  }

  async findById(id: string): Promise<Result<Announcement, AnnouncementError>> {
    const a = this.announcements.get(id);
    if (!a) return Result.err({ kind: "not_found" });
    return Result.ok(a);
  }

  async listAll(): Promise<Result<readonly Announcement[], AnnouncementError>> {
    return Result.ok(Array.from(this.announcements.values()));
  }

  async create(params: {
    title: string;
    content: string;
    severity?: "info" | "warning" | "critical";
    isActive?: boolean;
    startAt?: Date | null;
    endAt?: Date | null;
    createdById?: string | null;
  }): Promise<Result<Announcement, AnnouncementError>> {
    const id = `a-${Date.now()}`;
    const a: Announcement = Object.freeze({
      id,
      title: params.title,
      content: params.content,
      severity: params.severity ?? "info",
      isActive: params.isActive ?? true,
      startAt: params.startAt ?? null,
      endAt: params.endAt ?? null,
      createdById: params.createdById ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.announcements.set(id, a);
    return Result.ok(a);
  }

  async update(
    id: string,
    patch: Partial<{
      title: string;
      content: string;
      severity: "info" | "warning" | "critical";
      isActive: boolean;
      startAt: Date | null;
      endAt: Date | null;
    }>,
  ): Promise<Result<Announcement, AnnouncementError>> {
    const existing = this.announcements.get(id);
    if (!existing) return Result.err({ kind: "not_found" });
    const updated: Announcement = Object.freeze({ ...existing, ...patch, updatedAt: new Date() });
    this.announcements.set(id, updated);
    return Result.ok(updated);
  }

  async delete(id: string): Promise<Result<void, AnnouncementError>> {
    if (!this.announcements.has(id)) return Result.err({ kind: "not_found" });
    this.announcements.delete(id);
    return Result.ok(undefined);
  }

  async dismissForUser(announcementId: string, userId: string | null): Promise<Result<void, AnnouncementError>> {
    const key = `${announcementId}:${userId ?? "anonymous"}`;
    this.dismissed.add(key);
    return Result.ok(undefined);
  }

  async isDismissedByUser(announcementId: string, userId: string | null): Promise<Result<boolean, AnnouncementError>> {
    const key = `${announcementId}:${userId ?? "anonymous"}`;
    return Result.ok(this.dismissed.has(key));
  }

  clear(): void {
    this.announcements.clear();
    this.dismissed.clear();
  }
}
