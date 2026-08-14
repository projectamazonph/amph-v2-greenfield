/**
 * AdminQuizzesTable — Astryx Table for /admin/quizzes.
 *
 * STORY-091 (US-006). "use client" only because Table's renderCell
 * prop is a function. No pagination — quiz list is small.
 */

"use client";

import Link from "next/link";
import { Table, type TableColumn, Badge } from "@astryxdesign/core";

export interface QuizRow extends Record<string, unknown> {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  passingScore: number;
  questionCount: number;
}

const COLUMNS: TableColumn<QuizRow>[] = [
  {
    key: "title",
    header: "Title",
    width: { type: "proportional", value: 3 },
    renderCell: (row) => (
      <div>
        <Link
          href={`/admin/quizzes/${row.id}/edit`}
          style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
        >
          {row.title}
        </Link>
        <div style={{ fontSize: 11, color: "var(--ink-500)", fontFamily: "monospace" }}>
          {row.id}
        </div>
      </div>
    ),
  },
  {
    key: "course",
    header: "Course",
    width: { type: "proportional", value: 2 },
    renderCell: (row) => (
      <div>
        <div style={{ fontWeight: 500 }}>{row.courseTitle}</div>
        <div style={{ fontSize: 11, color: "var(--ink-500)", fontFamily: "monospace" }}>
          {row.courseId}
        </div>
      </div>
    ),
  },
  {
    key: "passing",
    header: "Passing",
    width: { type: "pixel", value: 90 },
    renderCell: (row) => <Badge variant="neutral" label={`${row.passingScore}%`} />,
  },
  {
    key: "questions",
    header: "Questions",
    width: { type: "pixel", value: 90 },
  },
  {
    key: "actions",
    header: "",
    width: { type: "pixel", value: 70 },
    align: "end",
    renderCell: (row) => (
      <Link
        href={`/admin/quizzes/${row.id}/edit`}
        style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500, fontSize: 13 }}
      >
        Edit
      </Link>
    ),
  },
];

export function AdminQuizzesTable({ quizzes }: { quizzes: readonly QuizRow[] }) {
  return (
    <Table
      data={quizzes as QuizRow[]}
      columns={COLUMNS}
      idKey="id"
      density="compact"
      dividers="rows"
      hasHover
    />
  );
}
