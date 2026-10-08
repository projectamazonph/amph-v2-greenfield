"use client";

/**
 * ModuleDependencyMatrix — visualizes module-to-module prerequisite relationships.
 *
 * STORY-108 gap closure (t_94861779).
 * Renders an N×N grid of modules (Core 9×9 or All 13×13).
 *
 * Cell colors and tooltips indicate whether:
 * - Row module is a PREREQUISITE for Column module (Prereq)
 * - Row module DEPENDS on Column module (Depends)
 * - Row and Column are the SAME module (Self)
 * - No prerequisite relationship exists (—)
 */

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@astryxdesign/core";
import type { ModuleDependencyMatrixData } from "@/usecases/GetModuleDependencyMatrix";
import styles from "./ModuleDependencyMatrix.module.css";

export interface ModuleDependencyMatrixProps {
  data: ModuleDependencyMatrixData;
  courseId?: string;
}

export function ModuleDependencyMatrix({ data, courseId }: ModuleDependencyMatrixProps) {
  const [range, setRange] = useState<"core" | "all">("all");

  const modules =
    range === "core" && data.modules.length >= 9 ? data.modules.slice(0, 9) : data.modules;

  const rowCount = modules.length;

  if (modules.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3 className={styles.emptyTitle}>No modules found</h3>
        <p className={styles.emptyDesc}>No curriculum modules exist to display in the matrix.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Legend & Toggle Controls */}
      <div className={styles.controls}>
        <div className={styles.legend}>
          <span className={styles.legendTitle}>Legend:</span>
          <div className={styles.legendItem}>
            <Badge variant="orange" label="Prerequisite" />
            <span style={{ fontSize: 12, color: "var(--ink-600)" }}>
              Row module is required for Column module
            </span>
          </div>
          <div className={styles.legendItem}>
            <Badge variant="warning" label="Dependent" />
            <span style={{ fontSize: 12, color: "var(--ink-600)" }}>
              Row module depends on Column module
            </span>
          </div>
          <div className={styles.legendItem}>
            <Badge variant="neutral" label="Self" />
            <span style={{ fontSize: 12, color: "var(--ink-600)" }}>Same module</span>
          </div>
        </div>

        <div className={styles.toggleGroup}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>View:</span>
          <button
            type="button"
            className={`${styles.toggleButton} ${range === "all" ? styles.toggleButtonActive : ""}`}
            onClick={() => setRange("all")}
          >
            All ({data.modules.length}×{data.modules.length})
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${range === "core" ? styles.toggleButtonActive : ""}`}
            onClick={() => setRange("core")}
          >
            Core (9×9)
          </button>
        </div>
      </div>

      {!data.hasPrerequisites && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>No Prerequisite Rules Configured</h3>
          <p className={styles.emptyDesc}>
            Prerequisites control course and lesson enrollment gating for students. Configure rules
            under course management to populate this matrix.
          </p>
          {courseId ? (
            <Link href={`/admin/courses/${courseId}/prerequisites`} className={styles.manageLink}>
              Configure Course Prerequisites
            </Link>
          ) : (
            <Link href="/admin/courses" className={styles.manageLink}>
              Manage Course Prerequisites
            </Link>
          )}
        </div>
      )}

      {/* Matrix Grid Table */}
      {data.hasPrerequisites && (
        <figure className={styles.tableWrapper} style={{ margin: 0 }}>
          <figcaption className="sr-only">
            Module Dependency Matrix ({rowCount} by {rowCount})
          </figcaption>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th className={styles.headerCell} scope="col">
                  Module (Row ↓ / Col →)
                </th>
                {modules.map((m) => (
                  <th
                    key={m.id}
                    className={styles.headerCell}
                    scope="col"
                    title={`${m.code}: ${m.title} (${m.courseTitle})`}
                  >
                    {m.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((rowMod, rIndex) => (
                <tr key={rowMod.id}>
                  <th className={styles.rowHeader} scope="row">
                    <span className={styles.rowCode}>{rowMod.code}</span>
                    <span>{rowMod.title}</span>
                    <span className={styles.courseBadge}>[{rowMod.courseSlug}]</span>
                  </th>

                  {modules.map((colMod, cIndex) => {
                    const cell = data.matrix[rIndex]?.[cIndex];
                    if (!cell) {
                      return (
                        <td key={colMod.id} className={styles.cellNone}>
                          —
                        </td>
                      );
                    }

                    if (cell.cellType === "SELF") {
                      return (
                        <td key={colMod.id} className={styles.cellSelf} title="Same module">
                          \
                        </td>
                      );
                    }

                    if (cell.cellType === "PREREQUISITE") {
                      return (
                        <td
                          key={colMod.id}
                          className={styles.cellPrereq}
                          title={cell.ruleSummary ?? "Prerequisite"}
                        >
                          Prereq
                        </td>
                      );
                    }

                    if (cell.cellType === "DEPENDENT") {
                      return (
                        <td
                          key={colMod.id}
                          className={styles.cellDependent}
                          title={cell.ruleSummary ?? "Dependent"}
                        >
                          Depends
                        </td>
                      );
                    }

                    return (
                      <td key={colMod.id} className={styles.cellNone} title="No direct rule">
                        —
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </div>
  );
}
