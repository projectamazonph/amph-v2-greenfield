"use client";

import { useState } from "react";

export function ShareCourseButton({ title }: { title: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function share() {
    const url = window.location.href;
    setStatus(null);
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setStatus("Course shared.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("Course link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Could not share this course. Copy the address from your browser instead.");
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ marginLeft: "var(--space-2)" }}
        onClick={share}
      >
        Share
      </button>
      <span role="status" aria-live="polite" style={{ marginLeft: "var(--space-2)" }}>
        {status}
      </span>
    </>
  );
}
