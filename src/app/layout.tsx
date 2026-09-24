import type { Metadata, Viewport } from "next";
// self-hosted fonts via @fontsource — no Google Fonts CDN fetch at build time
// weights match the original next/font/google config: Archivo 400/500/600/700,
// PT_Sans 400/700, Barlow_Condensed 500/600/700, IBM_Plex_Mono 400/500/600
import "@fontsource/archivo/latin-400.css";
import "@fontsource/archivo/latin-500.css";
import "@fontsource/archivo/latin-600.css";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/pt-sans/latin-400.css";
import "@fontsource/pt-sans/latin-700.css";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { SiteAnnouncementBanner } from "@/components/announcements/SiteAnnouncementBanner";
import { WebVitalsReporter } from "./WebVitalsReporter";
import { Providers } from "./providers";
import { buildAppUrl } from "@/domain/shared/AppUrl";
import "./globals.css";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#131921" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SiteAnnouncementBanner />
        <ImpersonationBanner />
        <WebVitalsReporter />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
