/**
 * PayMongoAdapter — implements IPaymentGateway using the PayMongo API.
 *
 * Uses PayMongo Checkout Sessions API:
 * https://developers.paymongo.com/docs/checkout-sessions
 *
 * Auth: Basic auth with secret key (base64-encoded).
 * Webhook verification: HMAC-SHA256.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { IPaymentGateway, CheckoutSession } from "@/ports/payment/IPaymentGateway";
import type { PaymentGatewayError } from "@/ports/payment/IPaymentGateway";
import { Result } from "@/domain/shared/Result";

// PayMongo API base URL
const PAYMONGO_BASE = "https://api.paymongo.com/v1";

type PayMongoCheckoutSessionAttributes = {
  checkout_url: string;
  created_at: number;
  expires_at: number;
  status: string;
};

type PayMongoApiResponse = {
  data: {
    id: string;
    attributes: PayMongoCheckoutSessionAttributes;
  };
  errors?: Array<{ code: string; detail: string }>;
};

type PayMongoRefundAttributes = {
  status: string; // "pending" | "succeeded" | "failed"
  created_at: number;
};

type PayMongoRefundResponse = {
  data: {
    id: string;
    attributes: PayMongoRefundAttributes;
  };
  errors?: Array<{ code: string; detail: string }>;
};

export class PayMongoAdapter implements IPaymentGateway {
  private readonly baseUrl = PAYMONGO_BASE;
  private readonly headers: HeadersInit;

  constructor(
    private readonly secretKey: string,
    private readonly _webhookSecret: string | undefined = undefined,
  ) {
    this.headers = {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    };
  }

  async createCheckoutSession(params: {
    courseId: string;
    courseTitle: string;
    amountMinor: number;
    currency: string;
    successUrl: string;
    failedUrl: string;
    metadata: Record<string, string>;
  }): Promise<Result<CheckoutSession, PaymentGatewayError>> {
    try {
      const res = await fetch(`${this.baseUrl}/checkout_sessions`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [
                {
                  name: params.courseTitle,
                  quantity: 1,
                  price: params.amountMinor,
                  currency: params.currency,
                },
              ],
              payment_method_types: ["card", "gcash", "grab_pay"],
              success_url: params.successUrl,
              failed_url: params.failedUrl,
              metadata: params.metadata,
              description: `Project Amazon PH Academy: ${params.courseTitle}`,
            },
          },
        }),
      });

      const json = (await res.json()) as PayMongoApiResponse;

      if (!res.ok) {
        const err = json.errors?.[0];
        return Result.err({
          kind: "paymongo_error",
          code: String(err?.code ?? "unknown"),
          message: err?.detail ?? `PayMongo API error (HTTP ${res.status})`,
        } satisfies PaymentGatewayError);
      }

      const attrs = json.data.attributes;
      return Result.ok({
        id: json.data.id,
        url: attrs.checkout_url,
        createdAt: new Date(attrs.created_at * 1000),
        expiresAt: new Date(attrs.expires_at * 1000),
      } satisfies CheckoutSession);
    } catch (err) {
      return Result.err({
        kind: "network_error",
        message: err instanceof Error ? err.message : String(err),
      } satisfies PaymentGatewayError);
    }
  }

  async getCheckoutSession(
    sessionId: string,
  ): Promise<Result<CheckoutSession, PaymentGatewayError>> {
    try {
      const res = await fetch(`${this.baseUrl}/checkout_sessions/${sessionId}`, {
        headers: this.headers,
      });
      const json = (await res.json()) as PayMongoApiResponse;

      if (!res.ok) {
        const err = json.errors?.[0];
        return Result.err({
          kind: "paymongo_error",
          code: String(err?.code ?? ""),
          message: err?.detail ?? `PayMongo API error (HTTP ${res.status})`,
        } satisfies PaymentGatewayError);
      }

      const attrs = json.data.attributes;
      return Result.ok({
        id: json.data.id,
        url: attrs.checkout_url,
        createdAt: new Date(attrs.created_at * 1000),
        expiresAt: new Date(attrs.expires_at * 1000),
      } satisfies CheckoutSession);
    } catch (err) {
      return Result.err({
        kind: "network_error",
        message: err instanceof Error ? err.message : String(err),
      } satisfies PaymentGatewayError);
    }
  }

  /**
   * Verify PayMongo webhook signature using HMAC-SHA256.
   *
   * PayMongo sends the signature header as:
   *   PayMongo-Signature: t=timestamp,v1=hmac_hex_digest
   *
   * The signature is computed as:
   *   HMAC-SHA256(webhook_secret, "timestamp.payload")
   */
  verifyWebhookSignature(payload: string, signature: string): Result<boolean, { kind: string }> {
    const webhookSecret = this._webhookSecret ?? process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return Result.err({ kind: "webhook_secret_missing" });
    }

    // Parse the signature header
    const parts = Object.fromEntries(
      signature.split(",").map((part) => {
        const [k, v] = part.split("=");
        return [k, v];
      }),
    );
    const timestamp = parts["t"] as string | undefined;
    const receivedHmac = parts["v1"] as string | undefined;

    if (!timestamp || !receivedHmac) {
      return Result.err({ kind: "invalid_signature_format" });
    }

    // Reject stale webhooks (> 5 minutes old)
    if (!/^\d+$/.test(timestamp)) {
      return Result.err({ kind: "invalid_signature_format" });
    }
    const timestampSeconds = Number(timestamp);
    if (!Number.isSafeInteger(timestampSeconds)) {
      return Result.err({ kind: "invalid_signature_format" });
    }
    const ageSeconds = Math.floor(Date.now() / 1000) - timestampSeconds;
    if (Math.abs(ageSeconds) > 300) {
      return Result.err({ kind: "stale_webhook" });
    }

    // Compute expected HMAC
    const signedPayload = `${timestamp}.${payload}`;
    const expectedHmac = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");

    // Constant-time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedHmac);
    const receivedBuffer = Buffer.from(receivedHmac);
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return Result.err({ kind: "signature_mismatch" });
    }

    return Result.ok(true);
  }

  /**
   * STORY-049.5: Issue a refund via the PayMongo Refunds API.
   * https://developers.paymongo.com/reference/create-a-refund
   *
   * PayMongo's `reason` field is a fixed enum (duplicate | fraudulent |
   * requested_by_customer | others), not free text. Our domain callers
   * (ProcessRefund, RefundOverride) pass an admin-authored free-text
   * reason, so it's sent as `notes` and the enum is pinned to "others"
   * rather than guessing a more specific category from the text.
   *
   * A "pending" refund status is treated as success: PayMongo accepted
   * the refund request and will settle it asynchronously. The caller
   * (ProcessRefund/RefundOverride) marks the order REFUNDED on any
   * Result.ok, matching how createCheckoutSession's "created but not yet
   * paid" state is already handled elsewhere in this adapter.
   */
  async refund(params: {
    paymongoPaymentId: string;
    amountMinor: number;
    reason: string;
  }): Promise<Result<{ refundId: string; processedAt: Date }, PaymentGatewayError>> {
    try {
      const res = await fetch(`${this.baseUrl}/refunds`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          data: {
            attributes: {
              amount: params.amountMinor,
              payment_id: params.paymongoPaymentId,
              reason: "others",
              notes: params.reason,
            },
          },
        }),
      });

      const json = (await res.json()) as PayMongoRefundResponse;

      if (!res.ok) {
        const err = json.errors?.[0];
        return Result.err({
          kind: "paymongo_error",
          code: String(err?.code ?? "unknown"),
          message: err?.detail ?? `PayMongo API error (HTTP ${res.status})`,
        } satisfies PaymentGatewayError);
      }

      const attrs = json.data.attributes;
      if (attrs.status === "failed") {
        return Result.err({
          kind: "paymongo_error",
          code: "refund_failed",
          message: `PayMongo refund ${json.data.id} was rejected (status: failed).`,
        } satisfies PaymentGatewayError);
      }

      return Result.ok({
        refundId: json.data.id,
        processedAt: new Date(attrs.created_at * 1000),
      });
    } catch (err) {
      return Result.err({
        kind: "network_error",
        message: err instanceof Error ? err.message : String(err),
      } satisfies PaymentGatewayError);
    }
  }
}
