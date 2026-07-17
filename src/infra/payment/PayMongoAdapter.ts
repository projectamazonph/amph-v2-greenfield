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
              description: `AMPH — ${params.courseTitle}`,
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
  verifyWebhookSignature(payload: string, signature: string): void {
    const webhookSecret = this._webhookSecret ?? process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("PAYMONGO_WEBHOOK_SECRET environment variable is not set");
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
      throw new Error("Invalid PayMongo signature format");
    }

    // Reject stale webhooks (> 5 minutes old)
    const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (ageSeconds > 300) {
      throw new Error(`Webhook timestamp too old: ${ageSeconds}s`);
    }

    // Compute expected HMAC
    const signedPayload = `${timestamp}.${payload}`;
    const expectedHmac = createHmac("sha256", webhookSecret)
      .update(signedPayload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(receivedHmac))) {
      throw new Error("Webhook signature mismatch — possible tampering");
    }
  }
}
