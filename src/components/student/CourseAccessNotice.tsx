import Link from "next/link";
import { LockKey, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import styles from "./CourseAccessNotice.module.css";

export type CourseAccessNoticeFeature = "lesson" | "quiz";
export type CourseAccessNoticeReason =
  | "preview_limit"
  | "plan_required"
  | "enrollment_required"
  | "verification_unavailable";

export interface CourseAccessNoticeProps {
  courseSlug: string;
  courseTitle: string;
  feature: CourseAccessNoticeFeature;
  reason: CourseAccessNoticeReason;
  signedIn: boolean;
  userTier?: string;
  requiredTier?: string;
}

export function CourseAccessNotice({
  courseSlug,
  courseTitle,
  feature,
  reason,
  signedIn,
  userTier,
  requiredTier,
}: CourseAccessNoticeProps) {
  const courseHref = `/courses/${courseSlug}`;
  const copy = getNoticeCopy({
    courseTitle,
    feature,
    reason,
    signedIn,
    userTier,
    requiredTier,
  });

  return (
    <main className={styles.page} aria-labelledby="course-access-title">
      <section className={styles.card}>
        <div className={styles.iconWrap} aria-hidden="true">
          <LockKey size={28} weight="bold" />
        </div>
        <p className={styles.eyebrow}>Course access</p>
        <h1 id="course-access-title" className={styles.title}>
          {copy.title}
        </h1>
        <p className={styles.body}>{copy.body}</p>
        <div className={styles.actions}>
          {!signedIn && reason !== "verification_unavailable" ? (
            <Link
              href={`/login?redirect=${encodeURIComponent(courseHref)}`}
              className="btn btn-primary"
            >
              Sign in
            </Link>
          ) : null}
          <Link href={courseHref} className="btn btn-secondary">
            {reason === "verification_unavailable" ? "Return to course" : "View course options"}
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function getNoticeCopy({
  courseTitle,
  feature,
  reason,
  signedIn,
  userTier,
  requiredTier,
}: CourseAccessNoticeProps): { title: string; body: string } {
  if (reason === "verification_unavailable") {
    return {
      title: "We couldn't verify your course access",
      body: "Your course content is safe. Refresh the page or return to the course and try again. If it still does not work, sign out and back in.",
    };
  }

  if (reason === "plan_required") {
    const currentPlan = userTier ?? "current";
    const requiredPlan = requiredTier ?? "eligible plan";
    return {
      title: `This ${feature} is not included in your current plan`,
      body: `Your ${currentPlan} plan does not include ${requiredPlan} access for ${courseTitle}. Choose an eligible plan to continue.`,
    };
  }

  if (reason === "enrollment_required") {
    return {
      title: `Enroll in ${courseTitle} to continue`,
      body: `Your account can see this ${feature}, but it needs an active enrollment before you can use it. Open the course page to enroll or review your access.`,
    };
  }

  if (feature === "quiz") {
    return {
      title: "This quiz opens with full course access",
      body: `Preview lessons help you see the teaching style in ${courseTitle}. Enroll or choose an eligible plan to take quizzes and save your score.`,
    };
  }

  if (signedIn) {
    return {
      title: "Your preview ends here",
      body: `You can preview the first lessons in ${courseTitle}, but this lesson needs full course access. Enroll or choose a plan that includes the course.`,
    };
  }

  return {
    title: "This lesson is in the full course",
    body: `You can preview the first lessons in ${courseTitle}. Sign in or enroll to keep learning past the preview.`,
  };
}
