/**
 * sitemap.ts — Next.js built-in sitemap generation.
 *
 * Public marketing + tool pages only. Auth, dashboard, and admin
 * routes are excluded (also blocked in robots.txt).
 *
 * The production origin is read from buildAppUrl() so preview
 * deployments don't accidentally publish production sitemap URLs.
 */

import type { MetadataRoute } from "next";
import { buildAppUrl } from "@/domain/shared/AppUrl";

const PUBLIC_PAGES = [
  "",
  "/courses",
  "/pricing",
  "/faq",
  "/tools",
  "/tools/bid-elevator",
  "/tools/str-triage",
  "/tools/campaign-builder",
  "/tools/listing-audit",
  "/tools/keyword-research",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  return PUBLIC_PAGES.map((path) => ({
    url: buildAppUrl(path),
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1.0 : path.startsWith("/tools") ? 0.8 : 0.7,
  }));
}
