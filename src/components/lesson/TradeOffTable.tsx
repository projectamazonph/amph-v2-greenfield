// src/components/lesson/TradeOffTable.tsx
/**
 * TradeOffTable - tabular comparison for concepts, definitions, or trade-offs.
 *
 * Server component. Two rendering forms: rectangular (columns + rows) and
 * pairs (key/value). Native HTML table with caption and scoped headers.
 * On screens < 640px, the wrapper allows horizontal scroll (no clipped cells).
 */

import type { ReactElement } from "react";
import styles from "./TradeOffTable.module.css";

export interface TradeOffRow {
  readonly label: string;
  readonly value: string;
}

export interface TradeOffTableProps {
  id: string;
  title: string;
  caption?: string;
  columns?: readonly string[];
  rows?: readonly TradeOffRow[];
  pairs?: readonly TradeOffRow[];
}

function hasData(props: TradeOffTableProps): boolean {
  if (props.pairs && props.pairs.length > 0) return true;
  if (props.rows && props.rows.length > 0) return true;
  return false;
}

export function TradeOffTable(props: TradeOffTableProps): ReactElement {
  const { id, title, caption, columns, rows, pairs } = props;

  if (!hasData(props)) {
    return (
      <figure id={id} className={styles.placeholder}>
        <figcaption className={styles.title}>{title}</figcaption>
        <p className={styles.empty}>No rows to display.</p>
      </figure>
    );
  }

  return (
    <figure id={id} className={styles.figure} aria-label={title}>
      <figcaption className={styles.title}>{title}</figcaption>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          {caption ? <caption className={styles.caption}>{caption}</caption> : null}
          <thead>
            {columns ? (
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            ) : null}
          </thead>
          <tbody>
            {pairs
              ? pairs.map((pair) => (
                  <tr key={pair.label}>
                    <th scope="row">{pair.label}</th>
                    <td>{pair.value}</td>
                  </tr>
                ))
              : (rows ?? []).map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
