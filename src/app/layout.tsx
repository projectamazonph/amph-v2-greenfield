import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { WebVitalsReporter } from "./WebVitalsReporter";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* STORY-047: shown when an admin is impersonating another user.
            Server component, reads the amph_admin_session cookie, returns
            null when not impersonating. */}
        <ImpersonationBanner />
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
