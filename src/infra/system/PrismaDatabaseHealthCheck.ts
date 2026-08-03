import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  DatabaseHealthCheck,
  DatabaseHealthCheckError,
} from "@/ports/system/DatabaseHealthCheck";

/** Production adapter for DatabaseHealthCheck — issues `SELECT 1`. */
export class PrismaDatabaseHealthCheck implements DatabaseHealthCheck {
  constructor(private readonly db: PrismaClient) {}

  async ping(): Promise<Result<void, DatabaseHealthCheckError>> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return Result.ok(undefined);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }
}
