/**
 * RefundEmail — sent when a refund is processed.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailDetail, EmailDetailsCard, EmailLayout, emailStyles } from "./EmailLayout";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";

export interface RefundEmailProps extends EmailTemplateOverride {
  firstName: string;
  orderNumber: string;
  courseTitle: string;
  amountMinor: number;
  currency: string;
  refundedAt: Date;
  reason: string;
  dashboardUrl?: string;
}

function formatMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(major);
}

export function RefundEmail({
  firstName,
  orderNumber,
  courseTitle,
  amountMinor,
  currency,
  refundedAt,
  reason,
  dashboardUrl,
  headlineOverride,
  introBodyOverride,
  ctaLabelOverride,
}: RefundEmailProps) {
  return (
    <EmailLayout preview={`Refund processed for ${orderNumber}`} eyebrow="Refund issued">
      <Heading as="h1" style={emailStyles.title}>
        {headlineOverride ?? `Your refund has been processed, ${firstName}`}
      </Heading>
      <Text style={emailStyles.body}>
        {introBodyOverride ??
          "We've issued a refund to your original payment method. Funds typically appear in your account within 5–10 business days, depending on your bank."}
      </Text>

      <EmailDetailsCard>
        <EmailDetail label="Order">{orderNumber}</EmailDetail>
        <EmailDetail label="Course">{courseTitle}</EmailDetail>
        <EmailDetail label="Refund amount">
          <span style={{ color: "#DC2626", fontSize: "20px" }}>
            {formatMoney(amountMinor, currency)}
          </span>
        </EmailDetail>
        <EmailDetail label="Refund reason">{reason}</EmailDetail>
        <EmailDetail label="Refund date">
          {refundedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </EmailDetail>
      </EmailDetailsCard>

      <Text style={{ ...emailStyles.body, marginBottom: "14px" }}>
        Your access to the course has been removed. If you change your mind, you can re-purchase
        anytime.
      </Text>
      {dashboardUrl ? (
        <Button href={dashboardUrl} style={emailStyles.button}>
          {ctaLabelOverride ?? "View your dashboard"}
        </Button>
      ) : null}
      <Text style={{ ...emailStyles.muted, marginTop: dashboardUrl ? "24px" : "0" }}>
        If you don't see the refund in your account within 10 business days, reply to this email and
        we'll investigate.
      </Text>
    </EmailLayout>
  );
}
