/**
 * `ListAvailableResources` — the student-facing download center.
 *
 * STORY-098. Lists every published resource, grouped implicitly by
 * `category` (the caller groups), and marks each one `locked: true`
 * when the viewer's subscription tier doesn't meet the resource's
 * `accessTier` — same hierarchy courses use (PRO ≥ STARTER ≥ PREVIEW).
 * Locked resources are still shown (so students know what upgrading
 * unlocks) but the download route itself re-checks access.
 */
import { Result } from "@/domain/shared/Result";
import type { Resource } from "@/domain/entities/Resource";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";
import { subscriptionMeetsCourseTier } from "@/domain/values/CourseAccessTier";
import type { SubscriptionTier } from "@/domain/entities/User";

export interface ListAvailableResourcesInput {
  subscriptionTier: SubscriptionTier;
}

export interface ResourceWithAccess {
  readonly resource: Resource;
  readonly locked: boolean;
}

export type ListAvailableResourcesResult = Result<ResourceWithAccess[], ResourceRepositoryError>;

export class ListAvailableResources {
  constructor(private readonly deps: { resourceRepo: IResourceRepository }) {}

  async execute(input: ListAvailableResourcesInput): Promise<ListAvailableResourcesResult> {
    const result = await this.deps.resourceRepo.listPublished();
    if (!result.ok) return result;

    return Result.ok(
      result.value.map((resource) => ({
        resource,
        locked: !subscriptionMeetsCourseTier(input.subscriptionTier, resource.accessTier),
      })),
    );
  }
}
