import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Amazon PH Academy v2",
  description: "Master Amazon PPC and seller central — built for Filipino VAs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
