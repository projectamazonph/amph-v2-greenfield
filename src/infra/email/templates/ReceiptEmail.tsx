/**
 * ReceiptEmail — sent after a successful order payment.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface ReceiptEmailProps {
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
}: ReceiptEmailProps) {
  return (
    <EmailLayout
      preview={`Receipt for ${orderNumber} — ${courseTitle}`}
      eyebrow="Payment confirmed"
    >
      <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#171717" }}>
        Thanks for your purchase, {firstName}!
      </Heading>
      <Text style={{ margin: "0 0 24px 0", color: "#404040" }}>
        Your payment was successful. You now have full access to the course below.
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
          Amount paid
        </Text>
        <Text style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: 700, color: "#0E7C3A" }}>
          {formatMoney(amountMinor, currency)}
        </Text>
        <Text style={{ margin: 0, fontSize: "12px", color: "#737373" }}>
          Paid on {paidAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </Text>
      </Section>

      <Button
        href={receiptUrl}
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
        View Receipt
      </Button>
      <Text style={{ margin: "24px 0 0 0", color: "#737373", fontSize: "13px" }}>
        Keep this email for your records. If you have any questions, reply to this email
        and our support team will help.
      </Text>
    </EmailLayout>
  );
}
