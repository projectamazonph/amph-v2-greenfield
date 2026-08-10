import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string; lessonId: string }>;
}

export default async function LegacyLessonQuizPage({ params }: Props) {
  const { slug, lessonId } = await params;
  redirect(`/courses/${encodeURIComponent(slug)}/quizzes/${encodeURIComponent(lessonId)}`);
}
