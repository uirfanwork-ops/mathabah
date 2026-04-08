import { StyleSheet, Font } from "@react-pdf/renderer";

// Brand palette (PDF-safe colours)
export const pdfColors = {
  bg: "#FFFFFF",
  ink: "#0A0A0A",
  muted: "#6B6B6B",
  border: "#E5DFD1",
  gold: "#C9A14A",
  goldLight: "#E6C878",
  red: "#7A0A13",
  redBright: "#9B1C2B",
  parchment: "#FDF8ED",
  emerald: "#166534",
  danger: "#B91C1C",
};

// Use built-in Helvetica so no font files need to be shipped with the bundle.
// @react-pdf/renderer includes Helvetica, Times-Roman and Courier by default.

export const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: pdfColors.bg,
    color: pdfColors.ink,
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 48,
    paddingHorizontal: 48,
    paddingBottom: 64,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.gold,
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brandMark: {
    flexDirection: "column",
  },
  brandName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: pdfColors.red,
    letterSpacing: 1.5,
  },
  brandSub: {
    fontSize: 8,
    color: pdfColors.muted,
    marginTop: 2,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  docKind: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: pdfColors.gold,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "right",
  },
  docDate: {
    fontSize: 8,
    color: pdfColors.muted,
    marginTop: 2,
    textAlign: "right",
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: pdfColors.ink,
    marginTop: 4,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: pdfColors.muted,
    marginBottom: 18,
  },
  sectionHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: pdfColors.red,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    paddingBottom: 3,
  },
  // Two-column key/value rows for meta blocks
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  metaCell: {
    width: "50%",
    paddingRight: 12,
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 8,
    color: pdfColors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 11,
    color: pdfColors.ink,
    marginTop: 1,
  },
  // Generic table
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: pdfColors.border,
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: pdfColors.parchment,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
  },
  tableRowLast: {
    flexDirection: "row",
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: pdfColors.ink,
    padding: 6,
  },
  td: {
    fontSize: 9,
    padding: 6,
    color: pdfColors.ink,
  },
  tdMuted: {
    fontSize: 9,
    padding: 6,
    color: pdfColors.muted,
  },
  tdMono: {
    fontFamily: "Courier",
    fontSize: 9,
    padding: 6,
    color: pdfColors.ink,
  },
  // Paragraph (for reports)
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: pdfColors.ink,
    marginBottom: 8,
  },
  // Highlight callout
  callout: {
    borderWidth: 1,
    borderColor: pdfColors.gold,
    backgroundColor: pdfColors.parchment,
    padding: 10,
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 12,
  },
  calloutConcern: {
    borderColor: pdfColors.red,
    backgroundColor: "#FBEAEA",
  },
  calloutLabel: {
    fontSize: 8,
    color: pdfColors.red,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  calloutText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: pdfColors.ink,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: pdfColors.muted,
  },
  pill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: pdfColors.gold,
    borderRadius: 999,
    paddingVertical: 1,
    paddingHorizontal: 6,
    fontSize: 8,
    color: pdfColors.red,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

export const COL_WIDTHS = {
  grade: { name: "40%", due: "15%", score: "15%", weight: "10%", feedback: "20%" },
  payment: { date: "18%", amount: "18%", method: "18%", reference: "25%", notes: "21%" },
  attendance: { date: "22%", course: "43%", status: "15%", notes: "20%" },
};

// Silence the font warning that @react-pdf/renderer emits for missing fonts
// by ensuring the default family is registered (no-op for built-ins).
export function ensurePdfFonts() {
  // Helvetica, Times-Roman and Courier ship with the library.
  // This function exists so pages can call it defensively before rendering.
  return Font;
}
