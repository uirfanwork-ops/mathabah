import {
  Document,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";

import { pdfColors, pdfStyles } from "@/lib/pdf/styles";

export interface TeacherReportData {
  generatedAt: string;
  report: {
    id: string;
    title: string;
    content: string;
    type: "mid_course" | "end_of_course" | "concern";
    isVisibleToStudent: boolean;
    createdAt: string;
  };
  teacher: {
    fullName: string;
    email: string;
  };
  student: {
    fullName: string;
    studentNumber: string | null;
  };
  course: {
    name: string;
    code: string | null;
  } | null;
}

const TYPE_LABEL: Record<TeacherReportData["report"]["type"], string> = {
  mid_course: "Mid-course report",
  end_of_course: "End-of-course report",
  concern: "Concern report",
};

export function TeacherReportPDF({ data }: { data: TeacherReportData }) {
  const isConcern = data.report.type === "concern";

  return (
    <Document
      title={`${TYPE_LABEL[data.report.type]} — ${data.student.fullName}`}
      author={data.teacher.fullName}
      subject={data.report.title}
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header} fixed>
          <View style={pdfStyles.brandMark}>
            <Text style={pdfStyles.brandName}>MATHABAH INSTITUTE</Text>
            <Text style={pdfStyles.brandSub}>Classical Islamic scholarship</Text>
          </View>
          <View>
            <Text style={pdfStyles.docKind}>{TYPE_LABEL[data.report.type]}</Text>
            <Text style={pdfStyles.docDate}>
              Filed {formatDate(data.report.createdAt)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={pdfStyles.title}>{data.report.title}</Text>
        <Text style={pdfStyles.subtitle}>
          Student: <Text style={{ color: pdfColors.ink }}>{data.student.fullName}</Text>
          {data.course && (
            <>
              {" · "}
              Course:{" "}
              <Text style={{ color: pdfColors.ink }}>
                {data.course.code ? `${data.course.code} — ` : ""}
                {data.course.name}
              </Text>
            </>
          )}
        </Text>

        {/* Concern callout */}
        {isConcern && (
          <View style={[pdfStyles.callout, pdfStyles.calloutConcern]}>
            <Text style={pdfStyles.calloutLabel}>Concern flag</Text>
            <Text style={pdfStyles.calloutText}>
              This report was filed as a student concern and was also sent to
              administration at the time of submission.
            </Text>
          </View>
        )}

        {/* Meta */}
        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Filed by</Text>
            <Text style={pdfStyles.metaValue}>{data.teacher.fullName}</Text>
            <Text style={{ fontSize: 9, color: pdfColors.muted, marginTop: 1 }}>
              {data.teacher.email}
            </Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Student number</Text>
            <Text style={pdfStyles.metaValue}>
              {data.student.studentNumber ?? "—"}
            </Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Report type</Text>
            <Text style={pdfStyles.metaValue}>
              {TYPE_LABEL[data.report.type]}
            </Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Visibility</Text>
            <Text style={pdfStyles.metaValue}>
              {data.report.isVisibleToStudent
                ? "Visible to student"
                : "Internal only"}
            </Text>
          </View>
        </View>

        {/* Body */}
        <Text style={pdfStyles.sectionHeader}>Observations</Text>
        <Text style={pdfStyles.paragraph}>{data.report.content}</Text>

        {/* Signature */}
        <View style={{ marginTop: 32 }}>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: pdfColors.border,
              width: 220,
              paddingTop: 6,
            }}
          >
            <Text style={{ fontSize: 9, color: pdfColors.ink }}>
              {data.teacher.fullName}
            </Text>
            <Text style={{ fontSize: 8, color: pdfColors.muted }}>
              Instructor, Mathabah Institute
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            Mathabah Institute · Confidential report
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
