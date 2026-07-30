import { SkeletonTable } from '@/components/ui/Skeleton';

export default function BadgesLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 960 }}>
      <SkeletonTable columns={3} rows={5} />
    </div>
  );
}
