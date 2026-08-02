import { describe, it, expect, beforeEach, vi } from "vitest";
import { PayMongoAdapter } from "@/infra/payment/PayMongoAdapter";
import { Result } from "@/domain/shared/Result";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = () => vi.fn() as any;

describe("PayMongoAdapter", () => {
  let adapter: PayMongoAdapter;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = mockFetch();
    global.fetch = fetchMock;
  });

  function mockResponse(data: object, status = 200) {
    fetchMock.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    });
  }

  describe("createCheckoutSession", () => {
    it("calls PayMongo API with correct URL and headers", async () => {
      mockResponse({
        data: {
          id: "cs_test_abc123",
          attributes: {
            checkout_url: "https://checkout.paymongo.com/cs_test_abc123",
            created_at: 1752787200,
            expires_at: 1752873600,
          },
        },
      });

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.createCheckoutSession({
        courseId: "course_01",
        courseTitle: "Amazon PPC Mastery",
        amountMinor: 299900,
        currency: "PHP",
        successUrl: "https://amph.example.com/checkout/success?orderId=o1",
        failedUrl: "https://amph.example.com/checkout/failed?orderId=o1",
        metadata: { orderId: "o1", userId: "u1", courseId: "course_01" },
      });

      expect(result.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.paymongo.com/v1/checkout_sessions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Basic"),
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("returns CheckoutSession on success", async () => {
      mockResponse({
        data: {
          id: "cs_xyz789",
          attributes: {
            checkout_url: "https://checkout.paymongo.com/cs_xyz789",
            created_at: 1752787200,
            expires_at: 1752873600,
          },
        },
      });

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.createCheckoutSession({
        courseId: "c1",
        courseTitle: "Course",
        amountMinor: 100000,
        currency: "PHP",
        successUrl: "https://ok.com/s",
        failedUrl: "https://ok.com/f",
        metadata: {},
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.id).toBe("cs_xyz789");
      expect(result.value.url).toBe("https://checkout.paymongo.com/cs_xyz789");
      expect(result.value.expiresAt).toBeInstanceOf(Date);
    });

    it("returns paymongo_error on API error response", async () => {
      mockResponse(
        {
          errors: [{ code: "server_error", detail: "Internal server error" }],
        },
        500,
      );

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.createCheckoutSession({
        courseId: "c1",
        courseTitle: "Course",
        amountMinor: 100000,
        currency: "PHP",
        successUrl: "https://ok.com/s",
        failedUrl: "https://ok.com/f",
        metadata: {},
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("paymongo_error");
      const pgErr = result.error as { kind: "paymongo_error"; code: string; message: string };
      expect(pgErr.code).toBe("server_error");
      expect(pgErr.message).toBe("Internal server error");
    });

    it("returns network_error on fetch exception", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Connection refused"));

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.createCheckoutSession({
        courseId: "c1",
        courseTitle: "Course",
        amountMinor: 100000,
        currency: "PHP",
        successUrl: "https://ok.com/s",
        failedUrl: "https://ok.com/f",
        metadata: {},
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("network_error");
    });

    it("returns paymongo_error when no error detail in response", async () => {
      mockResponse({ errors: [] }, 400);

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.createCheckoutSession({
        courseId: "c1",
        courseTitle: "Course",
        amountMinor: 100000,
        currency: "PHP",
        successUrl: "https://ok.com/s",
        failedUrl: "https://ok.com/f",
        metadata: {},
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("paymongo_error");
    });
  });

  describe("getCheckoutSession", () => {
    it("returns session on success", async () => {
      mockResponse({
        data: {
          id: "cs_existing",
          attributes: {
            checkout_url: "https://checkout.paymongo.com/cs_existing",
            created_at: 1752787200,
            expires_at: 1752873600,
          },
        },
      });

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.getCheckoutSession("cs_existing");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.id).toBe("cs_existing");
    });

    it("returns paymongo_error on 404", async () => {
      mockResponse({ errors: [{ code: "not_found", detail: "Session not found" }] }, 404);

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.getCheckoutSession("cs_nonexistent");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("paymongo_error");
    });
  });

  describe("refund", () => {
    it("calls the PayMongo refunds endpoint with amount, payment_id, and notes", async () => {
      mockResponse({
        data: {
          id: "ref_abc123",
          attributes: { status: "pending", created_at: 1752787200 },
        },
      });

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      await adapter.refund({
        paymongoPaymentId: "pay_xyz789",
        amountMinor: 299900,
        reason: "Student requested refund within window",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.paymongo.com/v1/refunds",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Basic"),
          }),
          body: JSON.stringify({
            data: {
              attributes: {
                amount: 299900,
                payment_id: "pay_xyz789",
                reason: "others",
                notes: "Student requested refund within window",
              },
            },
          }),
        }),
      );
    });

    it("returns refundId and processedAt on a pending refund", async () => {
      mockResponse({
        data: {
          id: "ref_pending1",
          attributes: { status: "pending", created_at: 1752787200 },
        },
      });

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.refund({
        paymongoPaymentId: "pay_1",
        amountMinor: 100000,
        reason: "Goodwill refund",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.refundId).toBe("ref_pending1");
      expect(result.value.processedAt).toBeInstanceOf(Date);
    });

    it("returns refundId on a succeeded refund", async () => {
      mockResponse({
        data: {
          id: "ref_done1",
          attributes: { status: "succeeded", created_at: 1752787200 },
        },
      });

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.refund({
        paymongoPaymentId: "pay_1",
        amountMinor: 100000,
        reason: "Goodwill refund",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.refundId).toBe("ref_done1");
    });

    it("returns paymongo_error when PayMongo reports the refund failed", async () => {
      mockResponse({
        data: {
          id: "ref_failed1",
          attributes: { status: "failed", created_at: 1752787200 },
        },
      });

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.refund({
        paymongoPaymentId: "pay_1",
        amountMinor: 100000,
        reason: "Goodwill refund",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("paymongo_error");
      const err = result.error as { kind: "paymongo_error"; code: string };
      expect(err.code).toBe("refund_failed");
    });

    it("returns paymongo_error on API error response", async () => {
      mockResponse({ errors: [{ code: "resource_not_found", detail: "Payment not found" }] }, 404);

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.refund({
        paymongoPaymentId: "pay_nonexistent",
        amountMinor: 100000,
        reason: "Goodwill refund",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("paymongo_error");
      const err = result.error as { kind: "paymongo_error"; code: string; message: string };
      expect(err.code).toBe("resource_not_found");
      expect(err.message).toBe("Payment not found");
    });

    it("returns network_error on fetch exception", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Connection refused"));

      adapter = new PayMongoAdapter("sk_test_secret", "whsec_test");
      const result = await adapter.refund({
        paymongoPaymentId: "pay_1",
        amountMinor: 100000,
        reason: "Goodwill refund",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("network_error");
    });
  });
});
