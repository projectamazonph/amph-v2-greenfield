import type { Metadata, Viewport } from "next";
import { Archivo, Barlow_Condensed, IBM_Plex_Mono, PT_Sans } from "next/font/google";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { WebVitalsReporter } from "./WebVitalsReporter";
import { Providers } from "./providers";
import { buildAppUrl } from "@/domain/shared/AppUrl";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cond",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

export const viewport: Viewport = {
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
      className={`${archivo.variable} ${ptSans.variable} ${barlowCondensed.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <ImpersonationBanner />
        <WebVitalsReporter />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
