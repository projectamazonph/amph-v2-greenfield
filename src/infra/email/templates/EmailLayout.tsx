/**
 * Shared, email-client-safe frame and content primitives for Project Amazon
 * PH Academy transactional messages.
 */

import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

const styles = {
  body: {
    backgroundColor: "#F4F3EE",
    color: "#202124",
    fontFamily: "Arial, Helvetica, sans-serif",
    margin: 0,
    padding: "36px 12px",
  },
  container: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DEDCD4",
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "600px",
    overflow: "hidden",
  },
  accentRule: {
    backgroundColor: "#FF6B35",
    height: "6px",
    lineHeight: "6px",
  },
  header: {
    backgroundColor: "#1A365D",
    padding: "28px 36px 26px",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.13em",
    lineHeight: "22px",
    margin: 0,
  },
  eyebrow: {
    color: "#FDB89C",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    lineHeight: "16px",
    margin: "0 0 7px",
    textTransform: "uppercase",
  },
  content: {
    color: "#303238",
    fontSize: "16px",
    lineHeight: "24px",
    padding: "38px 36px 40px",
  },
  footer: {
    backgroundColor: "#F8F7F3",
    borderTop: "1px solid #E8E6DF",
    color: "#6B6B6B",
    fontSize: "12px",
    lineHeight: "18px",
    padding: "22px 36px",
    textAlign: "center",
  },
  footerLink: {
    color: "#B9431B",
    fontWeight: 700,
    textDecoration: "none",
  },
} satisfies Record<string, CSSProperties>;

export const emailStyles = {
  title: {
    color: "#171717",
    fontSize: "27px",
    fontWeight: 700,
    letterSpacing: "-0.35px",
    lineHeight: "34px",
    margin: "0 0 16px",
  },
  body: {
    color: "#404040",
    fontSize: "16px",
    lineHeight: "25px",
    margin: "0 0 24px",
  },
  button: {
    backgroundColor: "#FF6B35",
    borderRadius: "6px",
    color: "#FFFFFF",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: "20px",
    padding: "13px 22px",
    textDecoration: "none",
  },
  detailCard: {
    backgroundColor: "#F8F7F3",
    border: "1px solid #E5E2D9",
    borderRadius: "8px",
    margin: "0 0 26px",
    padding: "22px 20px 8px",
  },
  detailLabel: {
    color: "#6B6B6B",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    lineHeight: "16px",
    margin: "0 0 4px",
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#202124",
    fontSize: "16px",
    fontWeight: 600,
    lineHeight: "23px",
    margin: "0 0 17px",
  },
  muted: {
    color: "#6B6B6B",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "24px 0 0",
  },
  link: {
    color: "#1A365D",
    fontWeight: 600,
    textDecoration: "underline",
  },
} satisfies Record<string, CSSProperties>;

export interface EmailLayoutProps {
  preview: string;
  eyebrow?: string;
  children: ReactNode;
  homeUrl?: string;
}

export function EmailLayout({
  preview,
  eyebrow,
  children,
  homeUrl = "https://projectamazonph.vercel.app",
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.accentRule} />
          <Section style={styles.header}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.brand}>PROJECT AMAZON PH ACADEMY</Text>
          </Section>
          <Section style={styles.content}>{children}</Section>
          <Section style={styles.footer}>
            <Text style={{ margin: "0 0 5px" }}>
              <a href={homeUrl} style={styles.footerLink}>
                Project Amazon PH Academy
              </a>
            </Text>
            <Text style={{ margin: 0 }}>
              You received this transactional email because you have an account with Project Amazon
              PH Academy.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailDetailsCard({ children }: { children: ReactNode }) {
  return <Section style={emailStyles.detailCard}>{children}</Section>;
}

export function EmailDetail({ children, label }: { children: ReactNode; label: string }) {
  return (
    <>
      <Text style={emailStyles.detailLabel}>{label}</Text>
      <Text style={emailStyles.detailValue}>{children}</Text>
    </>
  );
}

export function EmailNotice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning";
}) {
  const warning = tone === "warning";
  const noticeStyle: CSSProperties = {
    backgroundColor: warning ? "#FFF3ED" : "#F4F7FB",
    border: `1px solid ${warning ? "#F6C4AE" : "#D9E2F1"}`,
    borderLeft: `4px solid ${warning ? "#D65329" : "#1A365D"}`,
    borderRadius: "4px",
    color: warning ? "#6B2F1C" : "#334155",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "24px 0 0",
    padding: "12px 14px",
  };
  return <Text style={noticeStyle}>{children}</Text>;
}
