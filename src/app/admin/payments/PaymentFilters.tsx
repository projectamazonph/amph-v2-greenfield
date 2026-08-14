/**
 * PaymentFilters — client component for the admin payments filter form.
 *
 * M4 fix: submits on change so the admin does not need to click Apply.
 * The form uses GET to update URL search params, which the parent
 * server component reads via searchParams.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback } from "react";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";
import styles from "./page.module.css";

export const STATUSES: { value: PaymentStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "EXPIRED", label: "Expired" },
  { value: "REFUNDED", label: "Refunded" },
];

interface PaymentFiltersProps {
  defaultStatus: string;
  defaultEmail: string;
}

export function PaymentFilters({ defaultStatus, defaultEmail }: PaymentFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const submit = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.delete("page"); // reset to first page on filter change
      router.push(`/admin/payments?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handleChange(name: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      submit(name, e.target.value);
    };
  }

  return (
    <div className={styles.filters}>
      <label>
        <span>Status</span>
        <select
          name="status"
          defaultValue={defaultStatus}
          className={styles.select}
          onChange={handleChange("status")}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>User email</span>
        <input
          type="search"
          name="email"
          placeholder="e.g. alice@example.com"
          defaultValue={defaultEmail}
          className={styles.input}
          onChange={handleChange("email")}
        />
      </label>
      <Link href="/admin/payments" className={styles.clearButton}>
        Clear
      </Link>
    </div>
  );
}
