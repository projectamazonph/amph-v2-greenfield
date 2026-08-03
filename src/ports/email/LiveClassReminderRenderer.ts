/**
 * LiveClassReminderRenderer port — P0-7.
 *
 * Inverts the dependency between SendLiveClassReminders and the
 * LiveClassReminderEmail template. The use case depends on the
 * port; the composition root wires the port to the infra
 * adapter (which wraps the template).
 *
 * ADR-014: never throws across layer boundaries.
 */

import type { ReactElement } from "react";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";

export interface LiveClassReminderRenderer {
  render(
    args: {
      firstName: string;
      classTitle: string;
      startsAt: Date;
      joinUrl: string;
      minutesUntilStart: number;
    } & EmailTemplateOverride,
  ): ReactElement;
}
