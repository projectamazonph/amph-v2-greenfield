"use client";

/**
 * ConfirmSubmitButton — a <button type="submit"> that shows a native
 * confirm() dialog before letting the enclosing <form action={...}>
 * (a server action) actually submit.
 *
 * Bug fix: the previous code put `onClick={...}` directly on the
 * <form> in a Server Component (src/app/admin/courses/[id]/page.tsx),
 * which crashed the whole page at runtime — "Event handlers cannot be
 * passed to Client Component props" — because Server Components can't
 * attach DOM event listeners. Only the interactive bit (the confirm
 * check) needs to be a Client Component; the form and its action stay
 * server-rendered.
 */

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
  ...rest
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick">) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
