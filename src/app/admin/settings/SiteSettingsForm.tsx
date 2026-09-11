/**
 * SiteSettingsForm — client form for the /admin/settings site card.
 *
 * One form saves any key (create or replace). The value field takes
 * JSON text; the action parses it and reports syntax errors inline.
 * Existing rows render below with their values prefilled into the
 * editor when picked.
 */

"use client";

import { useActionState, useState } from "react";
import {
  setSettingAction,
  type SetSettingFormResult,
} from "@/app/actions/setting.action";
import styles from "./page.module.css";

const initialState: SetSettingFormResult | null = null;

export interface SiteSettingRow {
  key: string;
  valueJson: string;
  description: string | null;
  updatedById: string;
  updatedAt: string;
}

interface Props {
  rows: readonly SiteSettingRow[];
  justSaved: boolean;
}

export function SiteSettingsForm({ rows, justSaved }: Props) {
  const [state, formAction, isPending] = useActionState(setSettingAction, initialState);
  const [key, setKey] = useState("");
  const [valueJson, setValueJson] = useState("");
  const [description, setDescription] = useState("");

  const errorText = state?.kind === "error" ? (state.message ?? state.error) : null;

  function edit(row: SiteSettingRow) {
    setKey(row.key);
    setValueJson(row.valueJson);
    setDescription(row.description ?? "");
  }

  return (
    <div>
      {justSaved && (
        <p className={styles.twoFactorNotice} role="status">
          Setting saved.
        </p>
      )}
      {rows.length > 0 && (
        <table className={styles.table}>
          <caption className="sr-only">Saved site settings</caption>
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Value</th>
              <th scope="col">Description</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className={styles.key}>{row.key}</td>
                <td className={styles.mono}>{row.valueJson}</td>
                <td className={styles.description}>{row.description ?? "-"}</td>
                <td>
                  <button
                    type="button"
                    className={styles.submitButton}
                    onClick={() => edit(row)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form action={formAction} className={styles.twoFactorForm}>
        <label className={styles.field}>
          <span className={styles.label}>Key</span>
          <input
            type="text"
            name="key"
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="support_email"
            className={styles.input}
            disabled={isPending}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Value (JSON)</span>
          <textarea
            name="value"
            required
            rows={3}
            value={valueJson}
            onChange={(e) => setValueJson(e.target.value)}
            placeholder={'"support@projectamazonph.online"'}
            className={styles.input}
            disabled={isPending}
          />
          <span className={styles.hint}>
            Plain text becomes a JSON string when wrapped in quotes. Numbers,
            true/false, and objects work as written.
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Description (optional)</span>
          <input
            type="text"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            placeholder="Where this setting is used"
            className={styles.input}
            disabled={isPending}
          />
        </label>
        {errorText && (
          <p role="alert" className={styles.twoFactorError}>
            {errorText}
          </p>
        )}
        <button type="submit" className={styles.submitButton} disabled={isPending}>
          {isPending ? "Saving..." : "Save setting"}
        </button>
      </form>
    </div>
  );
}
