/**
 * /help — loading state.
 *
 * Renders a skeleton of the help page while the server resolves
 * the support email from site settings. Public-a11y-gates test
 * requires every non-admin route under src/app/ to ship a
 * loading.tsx; this is the matching file for the help page.
 */

export default function HelpLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      style={{
        minHeight: "100vh",
        background: "var(--surface-0)",
        padding: "var(--space-12) var(--space-6)",
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          color: "var(--ink-700)",
          fontFamily: "var(--font-body)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            margin: 0,
          }}
        >
          Loading the help page…
        </p>
      </div>
    </main>
  );
}
