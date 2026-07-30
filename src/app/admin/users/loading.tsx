import { SkeletonTable } from '@/components/ui/Skeleton';

export default function UsersLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 960 }}>
      <SkeletonTable columns={5} rows={8} />
    </div>
  );
}
