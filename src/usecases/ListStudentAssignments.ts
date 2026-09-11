/**
 * ListStudentAssignments — one student's work queue (P1-02, PR-C slice 2).
 *
 * Read model: no audit writes. Each row carries a derived `overdue`
 * flag so the student page can highlight past-due work without a
 * sweep mutating rows on read.
 */

import { Result } from "@/domain/shared/Result";
import { isOverdue, type Assignment } from "@/domain/entities/Assignment";
import type {
  IAssignmentRepository,
  AssignmentQueryError,
} from "@/ports/repositories/IAssignmentRepository";
import type { Clock } from "@/ports/system/Clock";

export interface StudentAssignmentRow {
  assignment: Assignment;
  overdue: boolean;
}

export type ListStudentAssignmentsResult = Result<
  { rows: readonly StudentAssignmentRow[] },
  AssignmentQueryError
>;

export interface ListStudentAssignmentsDeps {
  assignmentRepo: IAssignmentRepository;
  clock: Clock;
}

export class ListStudentAssignments {
  constructor(private readonly deps: ListStudentAssignmentsDeps) {}

  async execute(input: {
    userId: string;
    courseId?: string;
  }): Promise<ListStudentAssignmentsResult> {
    const listed = await this.deps.assignmentRepo.listByUser(input.userId, {
      courseId: input.courseId,
    });
    if (!listed.ok) {
      return Result.err(listed.error);
    }
    const now = this.deps.clock.now();
    return Result.ok({
      rows: listed.value.map((assignment) => ({
        assignment,
        overdue: isOverdue(assignment, now),
      })),
    });
  }
}
