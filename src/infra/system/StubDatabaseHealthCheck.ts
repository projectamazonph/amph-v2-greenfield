import { Result } from "@/domain/shared/Result";
import type {
  DatabaseHealthCheck,
  DatabaseHealthCheckError,
} from "@/ports/system/DatabaseHealthCheck";

/** Test fake for DatabaseHealthCheck — always reports healthy unless configured otherwise. */
export class StubDatabaseHealthCheck implements DatabaseHealthCheck {
  private failure: DatabaseHealthCheckError | null = null;

  /** Make the next (and subsequent) ping() calls fail, for testing the 503 path. */
  simulateFailure(message = "connection refused"): void {
    this.failure = { kind: "db_error", message };
  }

  async ping(): Promise<Result<void, DatabaseHealthCheckError>> {
    if (this.failure) return Result.err(this.failure);
    return Result.ok(undefined);
  }
}
