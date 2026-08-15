import Image from "next/image";

const COURSE_COVER_BY_SLUG: Readonly<Record<string, string>> = {
  "ppc-foundations": "/courses/ppc-foundations.png",
  "accelerated-mastery": "/courses/accelerated-mastery.png",
  "ppc-mastery": "/courses/accelerated-mastery.png",
  "ultimate-transformation": "/courses/ultimate-transformation.png",
  "ppc-ultimate": "/courses/ultimate-transformation.png",
};

const DEFAULT_COURSE_COVER = "/brand/photography/field-desk-hero.png";

export interface CourseCoverProps {
  title: string;
  slug: string;
  coverImage: string | null;
  className?: string;
  width?: number;
  height?: number;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
}

export function getCourseCoverImage(slug: string, coverImage: string | null): string {
  if (coverImage?.trim()) return coverImage;
  return COURSE_COVER_BY_SLUG[slug] ?? DEFAULT_COURSE_COVER;
}

/**
 * CourseCover renders the catalog card and detail-page artwork for a
 * course. The component was previously a raw `<img>` with an
 * `eslint-disable-next-line @next/next/no-img-element` comment; M-10
 * migrates it to `next/image` so the three local PNGs in
 * `public/courses/` get the Next.js image pipeline (responsive
 * `srcset`, AVIF/WebP variants, intrinsic `width`/`height` to prevent
 * layout shift).
 *
 * External cover images supplied via the database `coverImage` field
 * opt out of optimization via the per-instance `unoptimized` prop. The
 * database can hold any CDN host, so whitelisting every possible host
 * in `next.config.ts#images.remotePatterns` is not a realistic config;
 * the `unoptimized` flag keeps the current "render whatever URL is in
 * the database" behaviour without adding maintenance surface.
 *
 * The L-07 decorative contract (`alt=""` + `role="presentation"`)
 * survives the migration unchanged: the adjacent heading (h1 on the
 * detail page, h2 on the catalog card) carries the title, so assistive
 * tech must skip the image rather than announce the title twice.
 */
export function CourseCover({
  title,
  slug,
  coverImage,
  className,
  width = 640,
  height = 352,
  loading = "lazy",
  fetchPriority,
}: CourseCoverProps) {
  const src = getCourseCoverImage(slug, coverImage);
  const unoptimized = isExternalCoverUrl(src);
  // `title` is accepted as a prop so callers can pass the course name
  // for parity with the previous API. It is intentionally not rendered:
  // the L-07 contract keeps the image decorative and the adjacent
  // heading owns the title for screen readers and sighted users alike.
  void title;
  return (
    <Image
      src={src}
      alt=""
      role="presentation"
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      className={className}
      unoptimized={unoptimized}
    />
  );
}

function isExternalCoverUrl(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//");
}
