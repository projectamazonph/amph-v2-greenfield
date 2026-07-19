/**
 * `AdminListLiveClasses` — list live classes for the admin panel.
 *
 * STORY-050c.
 */
import type { Result } from "@/domain/shared/Result";
import type { LiveClass } from "@/domain/entities/LiveClass";
import type {
  ILiveClassRepository,
  LiveClassRepositoryError,
} from "@/ports/repositories/ILiveClassRepository";

export interface AdminListLiveClassesInput {
  courseId?: string;
}

export type AdminListLiveClassesResult = Result<
  LiveClass[],
  LiveClassRepositoryError
>;

export class AdminListLiveClasses {
  constructor(private readonly deps: { liveClassRepo: ILiveClassRepository }) {}

  async execute(
    input: AdminListLiveClassesInput = {},
  ): Promise<AdminListLiveClassesResult> {
    return this.deps.liveClassRepo.listAll({ courseId: input.courseId });
  }
}
