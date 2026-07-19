/**
 * IPaymentGateway — port for interacting with the payment provider (PayMongo).
 *
 * The adapter lives in src/infra/payment/PayMongoAdapter.ts.
 * Tests use StubPaymentGateway from the same directory.
 */

import type { Result } from "@/domain/shared/Result";

export interface CheckoutSession {
  /** PayMongo Checkout Session ID (e.g. "cs_abc123xyz") */
  id: string;
  /** Hosted checkout URL to redirect the student to */
  url: string;
  createdAt: Date;
  expiresAt: Date;
}

export type PaymentGatewayError =
  | { kind: "network_error"; message: string }
  | { kind: "invalid_course"; message: string }
  | { kind: "paymongo_error"; code: string; message: string };

export interface IPaymentGateway {
  /**
   * Create a PayMongo Checkout Session for a given course.
   * Returns the hosted checkout URL to redirect the student to.
   */
  createCheckoutSession(params: {
    courseId: string;
    courseTitle: string;
    amountMinor: number;   // integer minor units (centavos)
    currency: string;      // "PHP"
    successUrl: string;
    failedUrl: string;
    metadata: Record<string, string>; // { orderId, userId, courseId }
  }): Promise<Result<CheckoutSession, PaymentGatewayError>>;

  /**
   * Retrieve a Checkout Session by its PayMongo ID.
   */
  getCheckoutSession(sessionId: string): Promise<Result<CheckoutSession, PaymentGatewayError>>;

  /**
   * Verify a webhook signature from PayMongo.
   * Throws Error if the signature is invalid or tampered.
   * @param payload  Raw request body as string
   * @param signature  Value of the PayMongo-Signature header
   */
  verifyWebhookSignature(payload: string, signature: string): void;

  /**
   * STORY-049: Issue a refund for a paid PayMongo payment.
   *
   * The prod adapter (PayMongoAdapter) is currently a stub that throws
   * "not yet wired" — the real PayMongo Refunds API is a follow-up
   * (STORY-049.5). The StubPaymentGateway implements this for tests.
   *
   * @param params.paymongoPaymentId  The PayMongo payment ID (not the order ID)
   * @param params.amountMinor        Amount to refund, in minor units (centavos)
   * @param params.reason             Human-readable reason for the refund
   */
  refund(params: {
    paymongoPaymentId: string;
    amountMinor: number;
    reason: string;
  }): Promise<
    Result<
      { refundId: string; processedAt: Date },
      PaymentGatewayError
    >
  >;
}
