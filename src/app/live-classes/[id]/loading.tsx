export default function LiveClassDetailLoading() {
  return (
    <main aria-busy="true" style={{ padding: "var(--space-6)" }}>
      <p style={{ color: "var(--ink-500)", fontSize: "var(--text-sm)" }}>Loading live class...</p>
    </main>
  );
}
