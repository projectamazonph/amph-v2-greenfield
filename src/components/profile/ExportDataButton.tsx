"use client";

/**
 * ExportDataButton — client component: calls exportUserDataAction,
 * then triggers a browser download of the JSON result.
 *
 * STORY-096. A plain <form action> can't trigger a client-side file
 * download from a server action's return value, so this is one of the
 * few genuinely client-side pieces in the profile section.
 */

import { useState } from "react";
import { exportUserDataAction } from "@/app/actions/exportUserData.action";

export function ExportDataButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const result = await exportUserDataAction();
      if (!result.ok) {
        setStatus("error");
        return;
      }

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `amph-my-data-${result.data.profile.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className={className}
      >
        {status === "loading" ? "Preparing download..." : "Download my data (JSON)"}
      </button>
      {status === "error" && (
        <p
          role="alert"
          style={{
            color: "var(--danger)",
            fontSize: "var(--text-sm)",
            marginTop: "var(--space-2)",
          }}
        >
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
