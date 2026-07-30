import { SkeletonText, SkeletonBlock } from '@/components/ui/Skeleton';

export default function UserDetailLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 960 }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <SkeletonBlock width='60px' height='0.75rem' variant='text' />
        <SkeletonBlock width='8px' height='0.75rem' variant='text' />
        <SkeletonBlock width='80px' height='0.75rem' variant='text' />
      </div>
      <SkeletonBlock width='200px' height='1.75rem' variant='text' />
      <div style={{ marginTop: 'var(--space-8)' }}>
        <SkeletonText lines={6} />
      </div>
    </div>
  );
}
