"use client";

import { useEffect } from "react";
import { notifyPaymentFailure } from "@/app/actions/notifyPaymentFailure.action";

export function PaymentFailureNotifier({ orderId }: { orderId: string }) {
  useEffect(() => {
    if (!orderId) return;
    void notifyPaymentFailure(orderId);
  }, [orderId]);

  return null;
}
