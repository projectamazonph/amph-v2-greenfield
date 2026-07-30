import { SkeletonForm } from '@/components/ui/Skeleton';

export default function NewSimulatorLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 720 }}>
      <SkeletonForm fields={5} />
    </div>
  );
}
