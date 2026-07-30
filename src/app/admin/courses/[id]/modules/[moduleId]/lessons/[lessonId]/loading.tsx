import { SkeletonText, SkeletonBlock } from '@/components/ui/Skeleton';
export default function LessonDetailLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 720 }}>
      <SkeletonBlock width='200px' height='1.75rem' variant='text' />
      <div style={{ marginTop: 'var(--space-6)' }}><SkeletonText lines={6} /></div>
    </div>
  );
}
