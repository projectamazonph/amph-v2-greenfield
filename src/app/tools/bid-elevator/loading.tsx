import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';

export default function BidElevatorLoading() {
  return (
    <div style={{ padding: 'var(--space-10) var(--side-pad)', maxWidth: 720 }}>
      <SkeletonBlock width='40%' height='0.75rem' variant='text' />
      <div style={{ marginTop: 'var(--space-3)' }}><SkeletonBlock width='60%' height='2rem' variant='text' /></div>
      <div style={{ marginTop: 'var(--space-2)' }}><SkeletonBlock width='80%' height='0.875rem' variant='text' /></div>
      <div style={{ marginTop: 'var(--space-8)' }}><SkeletonBlock width='100%' height='200px' variant='rect' /></div>
      <div style={{ marginTop: 'var(--space-6)' }}><SkeletonText lines={6} /></div>
    </div>
  );
}
