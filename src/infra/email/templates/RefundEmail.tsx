/**
 * RefundEmail — sent when a refund is processed.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface RefundEmailProps {
  firstName: string;
  orderNumber: string;
  courseTitle: string;
  amountMinor: number;
  currency: string;
  refundedAt: Date;
  reason: string;
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
}: RefundEmailProps) {
  return (
    <EmailLayout
      preview={`Refund processed for ${orderNumber}`}
      eyebrow="Refund issued"
    >
      <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#171717" }}>
        Your refund has been processed, {firstName}
      </Heading>
      <Text style={{ margin: "0 0 24px 0", color: "#404040" }}>
        We've issued a refund to your original payment method. Funds typically appear in
        your account within 5–10 business days, depending on your bank.
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
          Order
        </Text>
        <Text style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 600, color: "#1a365d" }}>
          {orderNumber}
        </Text>
        <Text style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#737373", textTransform: "uppercase" }}>
          Course
        </Text>
        <Text style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 600, color: "#171717" }}>
          {courseTitle}
        </Text>
        <Text style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#737373", textTransform: "uppercase" }}>
          Refund amount
        </Text>
        <Text style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: 700, color: "#DC2626" }}>
          {formatMoney(amountMinor, currency)}
        </Text>
        <Text style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#737373", textTransform: "uppercase" }}>
          Refund reason
        </Text>
        <Text style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#171717" }}>
          {reason}
        </Text>
        <Text style={{ margin: 0, fontSize: "12px", color: "#737373" }}>
          Refunded on {refundedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </Text>
      </Section>

      <Text style={{ margin: "0 0 8px 0", color: "#404040" }}>
        Your access to the course has been removed. If you change your mind, you can
        re-purchase anytime.
      </Text>
      <Text style={{ margin: 0, color: "#737373", fontSize: "13px" }}>
        If you don't see the refund in your account within 10 business days, reply to
        this email and we'll investigate.
      </Text>
    </EmailLayout>
  );
}
