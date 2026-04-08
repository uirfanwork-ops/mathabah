import {
  Document,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";

import { pdfColors, pdfStyles } from "@/lib/pdf/styles";

export interface PaymentReceiptData {
  generatedAt: string;
  receiptNumber: string;
  payment: {
    amount: number;
    currency: string;
    paymentDate: string;
    method: string;
    reference: string | null;
    notes: string | null;
  };
  student: {
    fullName: string;
    email: string;
    studentNumber: string | null;
  };
  recordedBy: {
    fullName: string | null;
  };
}

export function PaymentReceiptPDF({ data }: { data: PaymentReceiptData }) {
  return (
    <Document
      title={`Payment receipt ${data.receiptNumber}`}
      author="Mathabah Institute"
      subject="Payment receipt"
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View style={pdfStyles.brandMark}>
            <Text style={pdfStyles.brandName}>MATHABAH INSTITUTE</Text>
            <Text style={pdfStyles.brandSub}>Classical Islamic scholarship</Text>
          </View>
          <View>
            <Text style={pdfStyles.docKind}>Payment Receipt</Text>
            <Text style={pdfStyles.docDate}>
              Issued {formatDate(data.generatedAt)}
            </Text>
          </View>
        </View>

        <Text style={pdfStyles.title}>Official Receipt</Text>
        <Text style={pdfStyles.subtitle}>
          Receipt no.{" "}
          <Text style={{ fontFamily: "Courier" }}>{data.receiptNumber}</Text>
        </Text>

        {/* Paid-by block */}
        <Text style={pdfStyles.sectionHeader}>Received from</Text>
        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Student</Text>
            <Text style={pdfStyles.metaValue}>{data.student.fullName}</Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Email</Text>
            <Text style={pdfStyles.metaValue}>{data.student.email}</Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Student number</Text>
            <Text style={pdfStyles.metaValue}>
              {data.student.studentNumber ?? "—"}
            </Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Payment date</Text>
            <Text style={pdfStyles.metaValue}>
              {formatDate(data.payment.paymentDate)}
            </Text>
          </View>
        </View>

        {/* Amount callout */}
        <View style={pdfStyles.callout}>
          <Text style={pdfStyles.calloutLabel}>Amount received</Text>
          <Text
            style={{
              fontFamily: "Helvetica-Bold",
              fontSize: 28,
              color: pdfColors.red,
              marginTop: 2,
            }}
          >
            {formatCurrency(data.payment.amount, data.payment.currency)}
          </Text>
        </View>

        {/* Detail block */}
        <Text style={pdfStyles.sectionHeader}>Payment details</Text>
        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Method</Text>
            <Text style={pdfStyles.metaValue}>
              {prettyMethod(data.payment.method)}
            </Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Reference</Text>
            <Text
              style={[pdfStyles.metaValue, { fontFamily: "Courier", fontSize: 10 }]}
            >
              {data.payment.reference ?? "—"}
            </Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Recorded by</Text>
            <Text style={pdfStyles.metaValue}>
              {data.recordedBy.fullName ?? "Mathabah Institute"}
            </Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Currency</Text>
            <Text style={pdfStyles.metaValue}>{data.payment.currency}</Text>
          </View>
        </View>

        {data.payment.notes && (
          <>
            <Text style={pdfStyles.sectionHeader}>Notes</Text>
            <Text style={pdfStyles.paragraph}>{data.payment.notes}</Text>
          </>
        )}

        {/* Acknowledgement */}
        <Text style={pdfStyles.sectionHeader}>Acknowledgement</Text>
        <Text style={pdfStyles.paragraph}>
          This receipt confirms that Mathabah Institute has received the payment
          described above from the student named. Please retain this document
          for your records. For any discrepancies, contact the Mathabah
          administration.
        </Text>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            Mathabah Institute · Official payment receipt
          </Text>
          <Text
            style={pdfStyles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function prettyMethod(m: string) {
  return m
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
