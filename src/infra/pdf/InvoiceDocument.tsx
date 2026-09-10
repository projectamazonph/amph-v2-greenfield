/**
 * InvoiceDocument — the React PDF component for a BIR sales invoice.
 *
 * P0-02 (P4 PR-B). A4 portrait, single page. Buyer-taxpayer details
 * render from the issuance-time snapshot; when the snapshot is empty
 * (webhook-issued before address capture) the block shows the buyer's
 * name and email from the User record instead of inventing an address.
 *
 * Amounts are minor units formatted as PHP. Tax is shown as its own
 * line; a zero-tax invoice states it plainly rather than hiding the row.
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceRenderInput } from "@/ports/rendering/InvoiceRenderer";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 24,
  },
  brand: {
    fontSize: 11,
    color: "#565959",
    letterSpacing: 1.5,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  title: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#0f1111",
  },
  meta: {
    fontSize: 10,
    color: "#565959",
    marginTop: 8,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f1111",
    marginBottom: 4,
  },
  body: {
    fontSize: 10,
    color: "#232f3e",
    lineHeight: 1.4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d5d9d9",
    paddingBottom: 6,
    marginTop: 12,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f4",
  },
  colDescription: { flex: 3, fontSize: 10, color: "#0f1111" },
  colQty: { flex: 1, fontSize: 10, color: "#232f3e", textAlign: "right" },
  colAmount: { flex: 2, fontSize: 10, color: "#0f1111", textAlign: "right" },
  totals: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 220,
    paddingVertical: 2,
  },
  totalLabel: { fontSize: 10, color: "#565959" },
  totalValue: { fontSize: 10, color: "#0f1111" },
  grandTotal: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#0f1111" },
  footer: {
    marginTop: 32,
    fontSize: 9,
    color: "#626a6a",
  },
});

function formatPhp(minor: number): string {
  return `PHP ${(minor / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function InvoiceDocument({ input }: { input: InvoiceRenderInput }) {
  const { invoice, buyer, courseTitle } = input;
  const snapshot = invoice.bir;
  const addressLines = [
    snapshot.addressLine1,
    snapshot.addressLine2,
    [snapshot.city, snapshot.province, snapshot.postalCode].filter(Boolean).join(", ") || null,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>PROJECT AMAZON PH ACADEMY</Text>
          <Text style={styles.title}>Sales Invoice</Text>
          <Text style={styles.meta}>
            {invoice.invoiceNumber} — issued {formatDate(invoice.issuedAt)} — due{" "}
            {formatDate(invoice.dueAt)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billed to</Text>
          <Text style={styles.body}>
            {buyer.firstName} {buyer.lastName} ({buyer.email})
          </Text>
          {snapshot.businessName ? <Text style={styles.body}>{snapshot.businessName}</Text> : null}
          {snapshot.tin ? <Text style={styles.body}>TIN: {snapshot.tin}</Text> : null}
          {addressLines.length > 0 ? (
            addressLines.map((line) => (
              <Text key={line} style={styles.body}>
                {line}
              </Text>
            ))
          ) : (
            <Text style={styles.body}>Address on file: not provided yet.</Text>
          )}
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDescription}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>
        {invoice.lineItems.map((item, index) => (
          <View key={`${item.description}-${index}`} style={styles.tableRow}>
            <Text style={styles.colDescription}>{item.description}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colAmount}>{formatPhp(item.totalMinor)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatPhp(invoice.subtotalMinor)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>{formatPhp(invoice.taxMinor)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total ({courseTitle})</Text>
            <Text style={styles.grandTotal}>{formatPhp(invoice.totalMinor)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Paid in Philippine pesos via PayMongo. This invoice was issued for order {invoice.orderId}
          . Keep it for your tax records.
        </Text>
      </Page>
    </Document>
  );
}
