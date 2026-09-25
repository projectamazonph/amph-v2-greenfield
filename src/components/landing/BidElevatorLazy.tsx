"use client";

import dynamic from "next/dynamic";

const BidElevator = dynamic(
  () => import("./BidElevator").then((m) => ({ default: m.BidElevator })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 480,
          background: "var(--c-card)",
          borderRadius: "var(--radius-lg)",
        }}
      />
    ),
  },
);

export function BidElevatorLazy() {
  return <BidElevator />;
}
