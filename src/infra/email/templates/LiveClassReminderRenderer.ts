/**
 * LiveClassReminderRenderer — adapter wrapping the
 * LiveClassReminderEmail template.
 *
 * P0-7: wires the React Email template to the
 * LiveClassReminderRenderer port.
 */

import type { ReactElement } from "react";
import type { LiveClassReminderRenderer } from "@/ports/email/LiveClassReminderRenderer";
import { LiveClassReminderEmail } from "./LiveClassReminderEmail";

export class LiveClassReminderTemplateRenderer
  implements LiveClassReminderRenderer
{
  render(args: {
    firstName: string;
    classTitle: string;
    startsAt: Date;
    joinUrl: string;
    minutesUntilStart: number;
  }): ReactElement {
    return LiveClassReminderEmail(args);
  }
}
