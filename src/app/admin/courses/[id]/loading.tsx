import { SkeletonCard, SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';

export default function CourseDetailLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 960 }}>
      <SkeletonBlock width='200px' height='1.75rem' variant='text' />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
          marginTop: 'var(--space-6)',
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}
