/**
 * Input — Amazon PH simulator form field.
 *
 * Per design spec §5: label above input, hint below input, error below hint.
 * Focus ring is 2px --accent + 2px --accent-soft outline-offset. Border
 * --border default, --accent on focus.
 *
 * Heights: sm=32, md=40 (default), lg=48.
 * forwardRef so forms with refs can attach.
 *
 * Server component (no client interactivity beyond native <input> events).
 * Consumers wrap it in a client component / form if they need useFormStatus.
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import styles from "./Input.module.css";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  size?: InputSize;
  /** Render a custom input (e.g., for password show/hide toggle wrapper). */
  rightAdornment?: ReactNode;
}

export const Input = forwardRef(function Input(
  { label, hint, error, size = "md", id, className, rightAdornment, ...rest }: InputProps,
  ref: Ref<HTMLInputElement>,
) {
  const inputId = id ?? rest.name ?? undefined;
  const describedBy =
    [hint ? `${inputId}-hint` : null, error ? `${inputId}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  // Required is announced via aria-required. The visual marker must stay
  // OUTSIDE the <label> element: Playwright getByLabel (and exact
  // accessible-name queries) match on label text, so a " *" inside the
  // label turns "Password" into "Password *" and breaks anchored
  // matchers like /^password$/i (E2E journey 3/4/5, 2026-09).
  const isRequired = rest.required === true;

  return (
    <div className={styles.field}>
      {label && (
        <span className={styles.labelRow}>
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
          {isRequired ? (
            <span aria-hidden="true" className={styles.requiredMark}>
              *
            </span>
          ) : null}
        </span>
      )}
      <div className={styles.inputWrap}>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-required={isRequired ? true : undefined}
          aria-describedby={describedBy}
          className={[styles.input, styles[size], error ? styles.error : "", className]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
        {rightAdornment && <div className={styles.adornment}>{rightAdornment}</div>}
      </div>
      {hint && !error && (
        <span id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${inputId}-error`} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

// S-2 fix (audit 2026-08-20, umbrella #404, child #406): explicit
// displayName. Input already gets a name from the named function arg
// to forwardRef, but the explicit assignment makes it survive a
// hypothetical anonymous wrapper refactor and matches the pattern in
// the rest of this folder.
Input.displayName = "Input";
