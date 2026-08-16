/**
 * ReceiptEmail — sent after a successful order payment.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailDetail, EmailDetailsCard, EmailLayout, emailStyles } from "./EmailLayout";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";

export interface ReceiptEmailProps extends EmailTemplateOverride {
  firstName: string;
  orderNumber: string;
  courseTitle: string;
  amountMinor: number;
  currency: string;
  paidAt: Date;
  receiptUrl: string;
}

function formatMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(major);
}

export function ReceiptEmail({
  firstName,
  orderNumber,
  courseTitle,
  amountMinor,
  currency,
  paidAt,
  receiptUrl,
  headlineOverride,
  introBodyOverride,
  ctaLabelOverride,
}: ReceiptEmailProps) {
  return (
    <EmailLayout
      preview={`Receipt for ${orderNumber} — ${courseTitle}`}
      eyebrow="Payment confirmed"
    >
      <Heading as="h1" style={emailStyles.title}>
        {headlineOverride ?? `Thanks for your purchase, ${firstName}!`}
      </Heading>
      <Text style={emailStyles.body}>
        {introBodyOverride ??
          "Your payment was successful. You now have full access to the course below."}
      </Text>

      <EmailDetailsCard>
        <EmailDetail label="Order">{orderNumber}</EmailDetail>
        <EmailDetail label="Course">{courseTitle}</EmailDetail>
        <EmailDetail label="Amount paid">
          <span style={{ color: "#0E7C3A", fontSize: "20px" }}>
            {formatMoney(amountMinor, currency)}
          </span>
        </EmailDetail>
        <EmailDetail label="Payment date">
          {paidAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </EmailDetail>
      </EmailDetailsCard>

      <Button href={receiptUrl} style={emailStyles.button}>
        {ctaLabelOverride ?? "View Receipt"}
      </Button>
      <Text style={emailStyles.muted}>
        Keep this email for your records. If you have any questions, reply to this email and our
        support team will help.
      </Text>
    </EmailLayout>
  );
}
