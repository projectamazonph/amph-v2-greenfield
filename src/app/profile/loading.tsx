import { SkeletonText, SkeletonBlock } from '@/components/ui/Skeleton';
export default function ProfileLoading() {
  return (
    <div style={{ padding: 'var(--space-10) var(--side-pad)', maxWidth: 640 }}>
      <SkeletonBlock width='120px' height='2rem' variant='text' />
      <div style={{ marginTop: 'var(--space-6)' }}><SkeletonText lines={8} /></div>
    </div>
  );
}
