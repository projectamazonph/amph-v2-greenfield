import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';

export default function RefundDetailLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 640 }}>
      <SkeletonBlock width='180px' height='1.75rem' variant='text' />
      <div style={{ marginTop: 'var(--space-6)' }}><SkeletonText lines={6} /></div>
    </div>
  );
}
