import { SkeletonForm } from '@/components/ui/Skeleton';
export default function EditDiscountCodeLoading() {
  return <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 720 }}><SkeletonForm fields={4} /></div>;
}
