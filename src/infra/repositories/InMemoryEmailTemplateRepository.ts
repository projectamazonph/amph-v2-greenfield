/**
 * InMemoryEmailTemplateRepository — fast in-memory fake for tests.
 *
 * STORY-063. Mirrors the IEmailTemplateRepository contract: keyed by
 * `type`, deterministic ordering on list, upsert replaces by `type`.
 */

import { Result } from "@/domain/shared/Result";
import type {
  IEmailTemplateRepository,
  EmailTemplateError,
} from "@/ports/repositories/IEmailTemplateRepository";
import type { EmailTemplate, EmailTemplateType } from "@/domain/entities/EmailTemplate";

export class InMemoryEmailTemplateRepository implements IEmailTemplateRepository {
  private byType = new Map<EmailTemplateType, EmailTemplate>();
  private byId = new Map<string, EmailTemplate>();

  async listAll(): Promise<Result<readonly EmailTemplate[], EmailTemplateError>> {
    try {
      const out = Array.from(this.byType.values()).sort((a, b) => a.type.localeCompare(b.type));
      return Result.ok(out);
    } catch (e) {
      return Result.err({ kind: "db_error", message: String(e) });
    }
  }

  async findByType(type: string): Promise<Result<EmailTemplate | null, EmailTemplateError>> {
    try {
      const tpl = this.byType.get(type as EmailTemplateType);
      return Result.ok(tpl ?? null);
    } catch (e) {
      return Result.err({ kind: "db_error", message: String(e) });
    }
  }

  async upsert(template: EmailTemplate): Promise<Result<void, EmailTemplateError>> {
    try {
      // Evict any prior row that pointed at this `id` (in case the
      // caller reused an id after a delete elsewhere).
      const previous = this.byId.get(template.id);
      if (previous && previous.type !== template.type) {
        this.byType.delete(previous.type);
      }
      this.byType.set(template.type, template);
      this.byId.set(template.id, template);
      return Result.ok(undefined);
    } catch (e) {
      return Result.err({ kind: "db_error", message: String(e) });
    }
  }

  /** Pre-seed a template. Test helper. */
  seed(template: EmailTemplate): void {
    this.byType.set(template.type, template);
    this.byId.set(template.id, template);
  }

  /** Drop every row. Test helper. */
  clear(): void {
    this.byType.clear();
    this.byId.clear();
  }
}
