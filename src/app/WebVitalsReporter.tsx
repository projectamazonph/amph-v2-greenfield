"use client";

/**
 * Web Vitals reporter — STORY-053.
 *
 * Client component that hooks into next/web-vitals and forwards
 * Core Web Vitals to the structured logger. Kept separate from
 * layout.tsx so the layout can remain a server component.
 */

import { useReportWebVitals } from "next/web-vitals";
import { reportWebVitals } from "@/lib/webVitals";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Logger wiring will be injected in STORY-052 follow-up.
    // For now, report without logger so the metric is captured
    // via console in development only.
    if (process.env.NODE_ENV === "development") {
      console.debug("[WebVital]", metric);
    }
    reportWebVitals(metric);
  });
  return null;
}
