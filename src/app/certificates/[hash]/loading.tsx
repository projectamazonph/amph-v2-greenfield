import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';

export default function CertificateViewLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10) var(--side-pad)' }}>
      <div style={{ width: 560, maxWidth: '100%', border: '2px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-10)', textAlign: 'center' }}>
        <SkeletonBlock width='48px' height='48px' variant='circle' />
        <div style={{ marginTop: 'var(--space-4)' }}><SkeletonBlock width='70%' height='1.5rem' variant='text' /></div>
        <div style={{ marginTop: 'var(--space-2)' }}><SkeletonBlock width='50%' height='0.875rem' variant='text' /></div>
        <div style={{ marginTop: 'var(--space-8)' }}><SkeletonText lines={5} /></div>
      </div>
    </div>
  );
}
