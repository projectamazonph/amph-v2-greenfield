/**
 * LiveClassReminderEmail — sent N minutes before a live class starts.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Button, Heading, Text } from "@react-email/components";
import {
  EmailDetail,
  EmailDetailsCard,
  EmailLayout,
  EmailNotice,
  emailStyles,
} from "./EmailLayout";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";

export interface LiveClassReminderEmailProps extends EmailTemplateOverride {
  firstName: string;
  classTitle: string;
  startsAt: Date;
  joinUrl: string;
  minutesUntilStart: number;
}

function formatStartsAt(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function LiveClassReminderEmail({
  firstName,
  classTitle,
  startsAt,
  joinUrl,
  minutesUntilStart,
  headlineOverride,
  introBodyOverride,
  ctaLabelOverride,
}: LiveClassReminderEmailProps) {
  const timeLabel =
    minutesUntilStart < 60
      ? `${minutesUntilStart} minutes`
      : `${Math.floor(minutesUntilStart / 60)} hour${minutesUntilStart >= 120 ? "s" : ""}`;

  return (
    <EmailLayout preview={`${classTitle} starts in ${timeLabel}`} eyebrow="Live class reminder">
      <Heading as="h1" style={emailStyles.title}>
        {headlineOverride ?? `Your live class starts in ${timeLabel}, ${firstName}`}
      </Heading>
      <Text style={emailStyles.body}>
        {introBodyOverride ??
          "Get ready to join us. Make sure you have a stable internet connection and a quiet space for the next hour or two."}
      </Text>

      <EmailDetailsCard>
        <EmailDetail label="Class">{classTitle}</EmailDetail>
        <EmailDetail label="Starts">{formatStartsAt(startsAt)}</EmailDetail>
        <EmailDetail label="Time remaining">{timeLabel}</EmailDetail>
      </EmailDetailsCard>

      <Button href={joinUrl} style={emailStyles.button}>
        {ctaLabelOverride ?? "Join Live Class"}
      </Button>

      <EmailNotice>
        The join link becomes active 10 minutes before the start time. If you have trouble joining,
        reply to this email.
      </EmailNotice>
    </EmailLayout>
  );
}
