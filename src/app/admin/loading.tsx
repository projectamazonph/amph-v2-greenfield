import { SkeletonStatTile, SkeletonTable } from '@/components/ui/Skeleton';
import styles from './page.module.css';

export default function AdminLoading() {
  return (
    <div style={{ padding: 'var(--space-8) var(--side-pad)', maxWidth: 960 }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <div style={{ width: 12, height: 12, background: 'var(--accent)', borderRadius: 2 }} />
          <div style={{ width: 80, height: '0.75rem', background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)' }} />
        </div>
        <div style={{ width: 200, height: '1.75rem', background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)' }} />
      </div>
      <div className={styles.statGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonStatTile key={i} />
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-8)' }}>
        <SkeletonTable columns={4} rows={5} />
      </div>
    </div>
  );
}
