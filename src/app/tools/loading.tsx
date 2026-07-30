import { SkeletonCard } from '@/components/ui/Skeleton';

export default function ToolsLoading() {
  return (
    <div style={{ padding: 'var(--space-10) var(--side-pad)', maxWidth: 960 }}>
      <div
        style={{
          width: '160px',
          height: '2rem',
          background: 'var(--surface-1)',
          borderRadius: 'var(--radius-sm)',
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-6)',
          marginTop: 'var(--space-8)',
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}
