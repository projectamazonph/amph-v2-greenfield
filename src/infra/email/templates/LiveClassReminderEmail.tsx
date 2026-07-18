/**
 * LiveClassReminderEmail — sent N minutes before a live class starts.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface LiveClassReminderEmailProps {
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
}: LiveClassReminderEmailProps) {
  const timeLabel = minutesUntilStart < 60
    ? `${minutesUntilStart} minutes`
    : `${Math.floor(minutesUntilStart / 60)} hour${minutesUntilStart >= 120 ? "s" : ""}`;

  return (
    <EmailLayout
      preview={`${classTitle} starts in ${timeLabel}`}
      eyebrow="Live class reminder"
    >
      <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#171717" }}>
        Your live class starts in {timeLabel}, {firstName}
      </Heading>
      <Text style={{ margin: "0 0 24px 0", color: "#404040" }}>
        Get ready to join us. Make sure you have a stable internet connection and a quiet
        space for the next hour or two.
      </Text>

      <Section
        style={{
          backgroundColor: "#F4F3EE",
          padding: "20px",
          borderRadius: "6px",
          margin: "0 0 24px 0",
        }}
      >
        <Text style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#737373", textTransform: "uppercase" }}>
          Class
        </Text>
        <Text style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: 600, color: "#1a365d" }}>
          {classTitle}
        </Text>
        <Text style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#737373", textTransform: "uppercase" }}>
          Starts
        </Text>
        <Text style={{ margin: 0, fontSize: "15px", color: "#171717" }}>
          {formatStartsAt(startsAt)}
        </Text>
      </Section>

      <Button
        href={joinUrl}
        style={{
          backgroundColor: "#FF6B35",
          color: "#ffffff",
          fontSize: "15px",
          fontWeight: 600,
          textDecoration: "none",
          padding: "12px 24px",
          borderRadius: "6px",
          display: "inline-block",
        }}
      >
        Join Live Class
      </Button>

      <Text style={{ margin: "24px 0 0 0", color: "#737373", fontSize: "13px" }}>
        The join link becomes active 10 minutes before the start time. If you have
        trouble joining, reply to this email.
      </Text>
    </EmailLayout>
  );
}
