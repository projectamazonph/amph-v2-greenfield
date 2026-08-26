import { Prisma, PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { XPEvent, XPReason } from "@/domain/entities/XPEvent";
import type {
  IXPAwardRepository,
  XPAwardCommand,
  XPAwardWriteError,
  XPAwardWriteResult,
} from "@/ports/repositories/IXPAwardRepository";

const MAX_TRANSACTION_RETRIES = 3;

type XPEventRow = {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  refId: string | null;
  createdAt: Date;
};

export class PrismaXPAwardRepository implements IXPAwardRepository {
  constructor(private readonly db: PrismaClient) {}

  async award(command: XPAwardCommand): Promise<Result<XPAwardWriteResult, XPAwardWriteError>> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
      try {
        const result = await this.db.$transaction(
          async (tx) => {
            const existing = await tx.xPEvent.findUnique({
              where: { awardKey: command.idempotencyKey },
            });

            if (existing) {
              const user = await tx.user.findUnique({
                where: { id: existing.userId },
                select: { totalXp: true },
              });
              if (!user) throw new UserNotFoundError();
              return {
                event: this.mapRow(existing),
                totalXp: user.totalXp,
                applied: false,
              } satisfies XPAwardWriteResult;
            }

            const user = await tx.user.findUnique({
              where: { id: command.event.userId },
              select: { id: true },
            });
            if (!user) throw new UserNotFoundError();

            const event = await tx.xPEvent.create({
              data: {
                id: command.event.id,
                userId: command.event.userId,
                amount: command.event.amount,
                reason: command.event.reason,
                refId: command.event.refId ?? null,
                awardKey: command.idempotencyKey,
                createdAt: command.event.createdAt,
              },
            });

            const updatedUser = await tx.user.update({
              where: { id: command.event.userId },
              data: { totalXp: { increment: command.event.amount } },
              select: { totalXp: true },
            });

            return {
              event: this.mapRow(event),
              totalXp: updatedUser.totalXp,
              applied: true,
            } satisfies XPAwardWriteResult;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return Result.ok(result);
      } catch (err: unknown) {
        if (err instanceof UserNotFoundError) {
          return Result.err({ kind: "user_not_found" });
        }

        const code = this.prismaCode(err);
        if ((code === "P2002" || code === "P2034") && attempt < MAX_TRANSACTION_RETRIES) {
          continue;
        }

        if (code === "P2002" || code === "P2034") {
          const existing = await this.findExisting(command.idempotencyKey);
          if (existing) return Result.ok(existing);
        }

        return Result.err({
          kind: "db_error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return Result.err({ kind: "db_error", message: "XP transaction retry limit exceeded" });
  }

  private async findExisting(idempotencyKey: string): Promise<XPAwardWriteResult | null> {
    try {
      const existing = await this.db.xPEvent.findUnique({ where: { awardKey: idempotencyKey } });
      if (!existing) return null;
      const user = await this.db.user.findUnique({
        where: { id: existing.userId },
        select: { totalXp: true },
      });
      if (!user) return null;
      return { event: this.mapRow(existing), totalXp: user.totalXp, applied: false };
    } catch {
      return null;
    }
  }

  private prismaCode(err: unknown): string | undefined {
    if (err && typeof err === "object" && "code" in err) {
      return String((err as { code: unknown }).code);
    }
    return undefined;
  }

  private mapRow(row: XPEventRow): XPEvent {
    return {
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      reason: row.reason as XPReason,
      refId: row.refId ?? undefined,
      createdAt: row.createdAt,
    };
  }
}

class UserNotFoundError extends Error {
  constructor() {
    super("XP award user not found");
  }
}
