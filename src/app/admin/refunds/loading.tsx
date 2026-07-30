import { SkeletonTable } from '@/components/ui/Skeleton';

export default function RefundsLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 960 }}>
      <SkeletonTable columns={5} rows={6} />
    </div>
  );
}
