import { SkeletonCard } from '@/components/ui/Skeleton';

export default function PricingLoading() {
  return (
    <div style={{ padding: 'var(--space-16) var(--side-pad)', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <div style={{ width: '180px', height: '2.5rem', background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)', margin: '0 auto' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={4} />
        ))}
      </div>
    </div>
  );
}
