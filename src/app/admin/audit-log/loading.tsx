import { SkeletonTable } from '@/components/ui/Skeleton';

export default function AuditLogLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 960 }}>
      <SkeletonTable columns={4} rows={10} />
    </div>
  );
}
