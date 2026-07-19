/**
 * Web Vitals reporting — STORY-053.
 *
 * Thin wrapper around next/web-vitals that sends Core Web Vitals
 * metrics to the structured logger in production.
 */

import type { NextWebVitalsMetric } from "next/app";
import type { Logger } from "@/ports/observability/Logger";

export function reportWebVitals(metric: NextWebVitalsMetric, logger?: Logger): void {
  if (typeof window === "undefined") return;
  logger?.info("web-vital", {
    name: metric.name,
    id: metric.id,
    value: metric.value,
    label: metric.label,
  });
}
