/**
 * AdminListAssignments — paginated admin view across students
 * (P1-02, PR-C slice 2).
 *
 * Read model: no audit writes. Supports course and status filters
 * with 1-based pagination capped at 50 rows per page.
 */

import { Result } from "@/domain/shared/Result";
import type { AssignmentStatus } from "@/domain/entities/Assignment";
import type {
  AssignmentPage,
  AssignmentQueryError,
  IAssignmentRepository,
} from "@/ports/repositories/IAssignmentRepository";

export interface AdminListAssignmentsInput {
  courseId?: string;
  status?: AssignmentStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type AdminListAssignmentsResult = Result<AssignmentPage, AssignmentQueryError>;

export interface AdminListAssignmentsDeps {
  assignmentRepo: IAssignmentRepository;
}

export class AdminListAssignments {
  constructor(private readonly deps: AdminListAssignmentsDeps) {}

  async execute(input: AdminListAssignmentsInput): Promise<AdminListAssignmentsResult> {
    return this.deps.assignmentRepo.listAll(input);
  }
}
