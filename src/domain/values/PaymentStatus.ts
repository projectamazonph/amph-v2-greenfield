/**
 * PaymentStatus — discriminated union for all possible payment states.
 *
 * The Order entity is the source of truth; PayMongo is the external system.
 * We never trust PayMongo's status directly — we map it to our domain states.
 */

/** All possible payment states for an Order. */
export type PaymentStatus =
  | "DRAFT" // Order created locally, not yet sent to PayMongo
  | "PENDING" // Checkout session created, waiting for payment
  | "PAID" // Payment confirmed by PayMongo webhook
  | "FAILED" // Payment attempt failed (card declined, etc.)
  | "EXPIRED" // Checkout session timed out (PayMongo: 24h default)
  | "REFUNDED"; // Full refund issued

const ALL_STATUSES: readonly PaymentStatus[] = [
  "DRAFT",
  "PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
];

export const PaymentStatus = {
  isPaid(s: PaymentStatus): boolean {
    return s === "PAID";
  },

  /**
   * Type guard for a value read back from persistence. A repository
   * adapter should call this before trusting a stored string as a
   * `PaymentStatus` — a corrupt or legacy row must not silently
   * hydrate an impossible state that bypasses the entity's
   * transition guards.
   */
  isValid(s: string): s is PaymentStatus {
    return (ALL_STATUSES as readonly string[]).includes(s);
  },

  isFinal(s: PaymentStatus): boolean {
    return s === "PAID" || s === "REFUNDED";
  },

  isActive(s: PaymentStatus): boolean {
    return s === "PENDING";
  },

  /**
   * Map PayMongo's checkout session status string to our domain status.
   * PayMongo statuses: "pending" | "paid" | "expired" | "failed"
   */
  fromPaymongo(paymongoStatus: string): PaymentStatus {
    switch (paymongoStatus) {
      case "paid":
        return "PAID";
      case "expired":
        return "EXPIRED";
      case "failed":
        return "FAILED";
      default:
        return "PENDING";
    }
  },
} as const;
