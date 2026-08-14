import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { WebVitalsReporter } from "./WebVitalsReporter";
import { Providers } from "./providers";
import { buildAppUrl } from "@/domain/shared/AppUrl";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(buildAppUrl("/")),
  title: "Project Amazon PH Academy",
  description: "Master Amazon PPC and seller central, built for Filipino VAs.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Project Amazon PH Academy",
    description: "Master Amazon PPC and seller central, built for Filipino VAs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Amazon PH Academy",
    description: "Master Amazon PPC and seller central, built for Filipino VAs.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* WCAG 2.4.1 Bypass Blocks: skip to main content */}
        <a href="#main-content" className="skip-link">Skip to main content</a>

        {/* STORY-047: shown when an admin is impersonating another user.
            Server component, reads the amph_admin_session cookie, returns
            null when not impersonating. */}
        <ImpersonationBanner />
        <WebVitalsReporter />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
