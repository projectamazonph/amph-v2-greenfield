import { SkeletonText, SkeletonBlock } from '@/components/ui/Skeleton';
export default function ContentLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 720 }}>
      <SkeletonBlock width='120px' height='1.75rem' variant='text' />
      <div style={{ marginTop: 'var(--space-6)' }}><SkeletonText lines={12} /></div>
    </div>
  );
}
