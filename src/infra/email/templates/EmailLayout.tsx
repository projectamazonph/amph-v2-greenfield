/**
 * EmailLayout — shared shell for all AMPH transactional emails.
 *
 * STORY-045: EmailSender port + React Email templates.
 *
 * Provides:
 *  - AMPH Academy header (logo placeholder, brand name)
 *  - Centered content slot
 *  - Footer with company info + copyright
 *
 * Brand colors match the certificate design (STORY-042):
 *  - Navy: #1a365d
 *  - Accent orange: #FF6B35 (CSS var --accent)
 *  - Surface: #FAFAF7
 *  - Ink: #171717
 *
 * Layout is table-based for maximum email client compatibility
 * (Outlook, Gmail web/mobile, Apple Mail).
 */

import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

const styles = {
  body: {
    backgroundColor: "#FAFAF7",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    margin: 0,
    padding: "40px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    maxWidth: "560px",
    borderRadius: "8px",
    overflow: "hidden" as const,
    border: "1px solid #E5E5E0",
  },
  header: {
    backgroundColor: "#1a365d",
    padding: "24px 32px",
    textAlign: "center" as const,
  },
  brand: {
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    margin: 0,
  },
  content: {
    padding: "40px 32px",
    color: "#171717",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  footer: {
    backgroundColor: "#F4F3EE",
    padding: "20px 32px",
    textAlign: "center" as const,
    color: "#737373",
    fontSize: "12px",
    lineHeight: 1.5,
  },
  footerLink: {
    color: "#FF6B35",
    textDecoration: "none",
  },
};

export interface EmailLayoutProps {
  /** Preheader text shown in inbox preview (hidden after open). */
  preview: string;
  /** Optional accent text shown beneath the brand. */
  eyebrow?: string;
  /** Page content. */
  children: ReactNode;
  /** Optional URL the footer "Project Amazon PH Academy" links to. */
  homeUrl?: string;
}

export function EmailLayout({ preview, eyebrow, children, homeUrl = "https://amph.example.com" }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            {eyebrow ? (
              <Text style={{ ...styles.brand, fontSize: "11px", marginBottom: "4px", opacity: 0.8 }}>
                {eyebrow}
              </Text>
            ) : null}
            <Text style={styles.brand}>PROJECT AMAZON PH ACADEMY</Text>
          </Section>
          <Section style={styles.content}>{children}</Section>
          <Section style={styles.footer}>
            <Text style={{ margin: "0 0 4px 0" }}>
              <a href={homeUrl} style={styles.footerLink}>
                Project Amazon PH Academy
              </a>
            </Text>
            <Text style={{ margin: 0 }}>
              You received this email because you have an account with AMPH Academy.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
