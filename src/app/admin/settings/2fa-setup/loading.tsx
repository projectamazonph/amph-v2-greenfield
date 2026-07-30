import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';
export default function TwoFactorSetupLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 480 }}>
      <SkeletonBlock width='180px' height='1.75rem' variant='text' />
      <div style={{ marginTop: 'var(--space-6)' }}><SkeletonText lines={4} /></div>
      <div style={{ marginTop: 'var(--space-6)' }}><SkeletonBlock width='100%' height='200px' variant='rect' /></div>
    </div>
  );
}
