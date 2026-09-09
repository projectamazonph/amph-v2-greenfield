/**
 * AnnouncementForm — shared client component for create + edit.
 *
 * P1-07 (P4 PR-A). Calls the server action and surfaces error
 * messages from the action's `humanizeError` map.
 */

"use client";

import { useState, useTransition } from "react";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
} from "@/app/actions/adminAnnouncements.action";
import styles from "./page.module.css";

export interface AnnouncementFormInitial {
  id?: string;
  title: string;
  body: string;
  level: "INFO" | "WARNING" | "CRITICAL";
  isActive: boolean;
  startsAt: string; // datetime-local string
  endsAt: string;
  dismissible: boolean;
}

export function AnnouncementForm({
  initial,
}: {
  initial: AnnouncementFormInitial;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      level: String(formData.get("level") ?? "INFO") as
        | "INFO"
        | "WARNING"
        | "CRITICAL",
      isActive: formData.get("isActive") === "on",
      startsAt: toIso(formData.get("startsAt")),
      endsAt: toIso(formData.get("endsAt")),
      dismissible: formData.get("dismissible") === "on",
    };
    startTransition(async () => {
      if (initial.id) {
        const r = await updateAnnouncementAction({ id: initial.id, ...payload });
        if (!r.ok) setError(r.message);
      } else {
        const r = await createAnnouncementAction(payload);
        if (!r.ok) setError(r.message);
      }
    });
  }

  return (
    <form action={onSubmit} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Title</span>
        <input
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={initial.title}
          className={styles.input}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Body</span>
        <textarea
          name="body"
          required
          rows={4}
          defaultValue={initial.body}
          className={styles.textarea}
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Level</span>
          <select name="level" defaultValue={initial.level} className={styles.input}>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Starts at</span>
          <input
            name="startsAt"
            type="datetime-local"
            defaultValue={initial.startsAt}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Ends at</span>
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={initial.endsAt}
            className={styles.input}
          />
        </label>
      </div>

      <div className={styles.checkboxes}>
        <label className={styles.checkbox}>
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={initial.isActive}
          />
          Active
        </label>
        <label className={styles.checkbox}>
          <input
            name="dismissible"
            type="checkbox"
            defaultChecked={initial.dismissible}
          />
          Dismissible
        </label>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Saving…" : initial.id ? "Save changes" : "Create announcement"}
      </button>
    </form>
  );
}

function toIso(value: FormDataEntryValue | null): Date | null {
  if (value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
