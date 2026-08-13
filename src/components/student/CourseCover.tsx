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
  width: number;
  height: number;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
}

export function getCourseCoverImage(slug: string, coverImage: string | null): string {
  if (coverImage?.trim()) return coverImage;
  return COURSE_COVER_BY_SLUG[slug] ?? DEFAULT_COURSE_COVER;
}

export function CourseCover({
  title,
  slug,
  coverImage,
  className,
  width,
  height,
  loading = "lazy",
  fetchPriority,
}: CourseCoverProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getCourseCoverImage(slug, coverImage)}
      alt={title}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      className={className}
    />
  );
}
