import type { IPaymentGateway, CheckoutSession } from "@/ports/payment/IPaymentGateway";
import type { PaymentGatewayError } from "@/ports/payment/IPaymentGateway";
import { Result } from "@/domain/shared/Result";

export interface PaymentGatewayCall {
  params: Parameters<IPaymentGateway["createCheckoutSession"]>[0];
}

export class StubPaymentGateway implements IPaymentGateway {
  shouldFail = false;
  failureReason: PaymentGatewayError = { kind: "network_error", message: "stub failure" };
  private _checkoutSessions = new Map<string, CheckoutSession>();

  /** All calls made to createCheckoutSession */
  calls: PaymentGatewayCall[] = [];

  async createCheckoutSession(
    params: Parameters<IPaymentGateway["createCheckoutSession"]>[0],
  ): Promise<Result<CheckoutSession, PaymentGatewayError>> {
    this.calls.push({ params });

    if (this.shouldFail) {
      return Result.err(this.failureReason);
    }

    const session: CheckoutSession = {
      id: "cs_test_123",
      url: "https://checkout.paymongo.com/cs_test_123",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    this._checkoutSessions.set(session.id, session);
    return Result.ok(session);
  }

  async getCheckoutSession(
    sessionId: string,
  ): Promise<Result<CheckoutSession, PaymentGatewayError>> {
    const session = this._checkoutSessions.get(sessionId);
    if (!session) {
      return Result.err({ kind: "paymongo_error", code: "not_found", message: `Session ${sessionId} not found` });
    }
    return Result.ok(session);
  }

  verifyWebhookSignature(_payload: string, _signature: string): void {
    // Stub always passes — override in specific tests to test rejection
  }

  // ── STORY-049: refund support ─────────────────────────────────

  /** All refund calls. */
  refundCalls: {
    paymongoPaymentId: string;
    amountMinor: number;
    reason: string;
  }[] = [];

  /** If set, refund() will return this error instead of success. */
  refundShouldFail: PaymentGatewayError | null = null;

  private _refundCounter = 0;

  async refund(params: {
    paymongoPaymentId: string;
    amountMinor: number;
    reason: string;
  }): Promise<
    Result<{ refundId: string; processedAt: Date }, PaymentGatewayError>
  > {
    this.refundCalls.push({ ...params });

    if (this.refundShouldFail) {
      return Result.err(this.refundShouldFail);
    }

    this._refundCounter += 1;
    return Result.ok({
      refundId: `re_test_${this._refundCounter}`,
      processedAt: new Date(),
    });
  }

  /** Simulate a webhook event being processed */
  simulateWebhook(orderId: string, sessionId: string, eventType: string): object {
    return {
      type: eventType,
      data: { id: sessionId, attributes: { metadata: { orderId } } },
    };
  }
}
