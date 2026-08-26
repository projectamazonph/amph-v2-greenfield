import { Result } from "@/domain/shared/Result";
import type { XPEvent } from "@/domain/entities/XPEvent";

export interface XPAwardCommand {
  event: XPEvent;
  idempotencyKey: string;
}

export interface XPAwardWriteResult {
  event: XPEvent;
  totalXp: number;
  applied: boolean;
}

export type XPAwardWriteError = { kind: "user_not_found" } | { kind: "db_error"; message: string };

/**
 * Atomic write boundary for XP. Implementations must commit the XP event and
 * user aggregate update together, and must not apply the same idempotency key
 * more than once.
 */
export interface IXPAwardRepository {
  award(command: XPAwardCommand): Promise<Result<XPAwardWriteResult, XPAwardWriteError>>;
}
