import { SkeletonCard } from '@/components/ui/Skeleton';

export default function HomeLoading() {
  return (
    <div style={{ padding: 'var(--space-16) var(--side-pad)', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <div style={{ width: '60%', height: '2.5rem', background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)', margin: '0 auto' }} />
        <div style={{ width: '40%', height: '0.875rem', background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)', margin: 'var(--space-3) auto 0' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </div>
  );
}
