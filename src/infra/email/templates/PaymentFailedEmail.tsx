/**
 * PaymentFailedEmail — notifies a buyer their payment didn't go through.
 *
 * Template + renderer only — not wired to a live trigger. The PayMongo
 * webhook route (src/app/api/webhooks/paymongo/route.ts) only handles
 * `checkout_session.completed` today; there is no payment-failure event
 * branch to hook this into yet. Ready to wire in once that branch exists.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface PaymentFailedEmailProps {
  firstName: string;
  courseTitle: string;
  retryUrl: string;
}

export function PaymentFailedEmail({ firstName, courseTitle, retryUrl }: PaymentFailedEmailProps) {
  return (
    <EmailLayout
      preview={`Your payment for ${courseTitle} didn't go through`}
      eyebrow="Payment failed"
    >
      <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#171717" }}>
        Your payment didn&apos;t go through
      </Heading>
      <Text style={{ margin: "0 0 24px 0", color: "#404040" }}>
        Hi {firstName}, we couldn&apos;t complete your payment for <strong>{courseTitle}</strong>.
        No charge was made. You can try again below — if a payment method was declined, use a
        different one.
      </Text>

      <Button
        href={retryUrl}
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
        Try again
      </Button>
    </EmailLayout>
  );
}
