"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RedirectCountdownProps {
  to: string;
  seconds: number;
}

export function RedirectCountdown({ to, seconds }: RedirectCountdownProps) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      router.push(to);
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, router, to]);

  return (
    <span aria-live="polite">
      Redirecting to dashboard in {remaining}s
    </span>
  );
}
