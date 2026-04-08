import {
  Document,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";

import { COL_WIDTHS, pdfColors, pdfStyles } from "@/lib/pdf/styles";

export interface StudentReportData {
  generatedAt: string;
  student: {
    fullName: string;
    email: string;
    studentNumber: string | null;
    enrollmentDate: string | null;
  };
  courses: Array<{
    id: string;
    name: string;
    code: string | null;
    teacherName: string | null;
    status: string;
    weightedAveragePct: number | null;
    assessments: Array<{
      name: string;
      dueDate: string | null;
      score: number | null;
      maxScore: number;
      weight: number;
      feedback: string | null;
    }>;
    attendance: {
      total: number;
      present: number;
      late: number;
      excused: number;
      absent: number;
    };
  }>;
  overall: {
    attendancePct: number | null;
    totalSessions: number;
    attendedSessions: number;
    cumulativeAveragePct: number | null;
  };
}

export function StudentReportPDF({ data }: { data: StudentReportData }) {
  return (
    <Document
      title={`Student report — ${data.student.fullName}`}
      author="Mathabah Institute"
      subject="Student report card"
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header} fixed>
          <View style={pdfStyles.brandMark}>
            <Text style={pdfStyles.brandName}>MATHABAH INSTITUTE</Text>
            <Text style={pdfStyles.brandSub}>Classical Islamic scholarship</Text>
          </View>
          <View>
            <Text style={pdfStyles.docKind}>Student Report Card</Text>
            <Text style={pdfStyles.docDate}>
              Issued {formatDate(data.generatedAt)}
            </Text>
          </View>
        </View>

        {/* Title block */}
        <Text style={pdfStyles.title}>{data.student.fullName}</Text>
        <Text style={pdfStyles.subtitle}>
          Progress across {data.courses.length} course
          {data.courses.length === 1 ? "" : "s"}
        </Text>

        {/* Meta */}
        <View style={pdfStyles.metaGrid}>
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
            <Text style={pdfStyles.metaLabel}>Enrolled since</Text>
            <Text style={pdfStyles.metaValue}>
              {data.student.enrollmentDate
                ? formatDate(data.student.enrollmentDate)
                : "—"}
            </Text>
          </View>
          <View style={pdfStyles.metaCell}>
            <Text style={pdfStyles.metaLabel}>Cumulative average</Text>
            <Text style={pdfStyles.metaValue}>
              {data.overall.cumulativeAveragePct !== null
                ? `${data.overall.cumulativeAveragePct.toFixed(1)}%`
                : "—"}
            </Text>
          </View>
        </View>

        {/* Overall callout */}
        <View style={pdfStyles.callout}>
          <Text style={pdfStyles.calloutLabel}>Overall attendance</Text>
          <Text style={pdfStyles.calloutText}>
            {data.overall.attendancePct !== null
              ? `${data.overall.attendancePct}%`
              : "No sessions recorded"}{" "}
            <Text style={{ fontSize: 9, color: pdfColors.muted }}>
              ({data.overall.attendedSessions}/{data.overall.totalSessions}{" "}
              sessions)
            </Text>
          </Text>
        </View>

        {/* Per-course sections */}
        {data.courses.length === 0 ? (
          <Text style={pdfStyles.paragraph}>
            This student is not currently enrolled in any courses.
          </Text>
        ) : (
          data.courses.map((course) => (
            <View key={course.id} wrap={false} style={{ marginBottom: 6 }}>
              <Text style={pdfStyles.sectionHeader}>
                {course.code ? `${course.code} — ` : ""}
                {course.name}
              </Text>

              <View style={pdfStyles.metaGrid}>
                <View style={pdfStyles.metaCell}>
                  <Text style={pdfStyles.metaLabel}>Teacher</Text>
                  <Text style={pdfStyles.metaValue}>
                    {course.teacherName ?? "—"}
                  </Text>
                </View>
                <View style={pdfStyles.metaCell}>
                  <Text style={pdfStyles.metaLabel}>Enrolment status</Text>
                  <Text style={pdfStyles.metaValue}>{course.status}</Text>
                </View>
                <View style={pdfStyles.metaCell}>
                  <Text style={pdfStyles.metaLabel}>Weighted average</Text>
                  <Text style={pdfStyles.metaValue}>
                    {course.weightedAveragePct !== null
                      ? `${course.weightedAveragePct.toFixed(1)}%`
                      : "Not yet graded"}
                  </Text>
                </View>
                <View style={pdfStyles.metaCell}>
                  <Text style={pdfStyles.metaLabel}>Attendance</Text>
                  <Text style={pdfStyles.metaValue}>
                    {course.attendance.total === 0
                      ? "No sessions"
                      : `${course.attendance.present + course.attendance.late}/${course.attendance.total}` +
                        ` · ${
                          course.attendance.absent > 0
                            ? `${course.attendance.absent} absent`
                            : "none missed"
                        }`}
                  </Text>
                </View>
              </View>

              {course.assessments.length > 0 && (
                <View style={pdfStyles.table}>
                  <View style={pdfStyles.tableHeaderRow}>
                    <Text style={[pdfStyles.th, { width: COL_WIDTHS.grade.name }]}>
                      Assessment
                    </Text>
                    <Text style={[pdfStyles.th, { width: COL_WIDTHS.grade.due }]}>
                      Due
                    </Text>
                    <Text style={[pdfStyles.th, { width: COL_WIDTHS.grade.score }]}>
                      Score
                    </Text>
                    <Text style={[pdfStyles.th, { width: COL_WIDTHS.grade.weight }]}>
                      Weight
                    </Text>
                    <Text
                      style={[pdfStyles.th, { width: COL_WIDTHS.grade.feedback }]}
                    >
                      Feedback
                    </Text>
                  </View>
                  {course.assessments.map((a, i) => (
                    <View
                      key={`${course.id}-${i}`}
                      style={
                        i === course.assessments.length - 1
                          ? pdfStyles.tableRowLast
                          : pdfStyles.tableRow
                      }
                    >
                      <Text style={[pdfStyles.td, { width: COL_WIDTHS.grade.name }]}>
                        {a.name}
                      </Text>
                      <Text
                        style={[pdfStyles.tdMuted, { width: COL_WIDTHS.grade.due }]}
                      >
                        {a.dueDate ? formatDate(a.dueDate) : "—"}
                      </Text>
                      <Text
                        style={[pdfStyles.tdMono, { width: COL_WIDTHS.grade.score }]}
                      >
                        {a.score !== null ? `${a.score} / ${a.maxScore}` : "—"}
                      </Text>
                      <Text
                        style={[
                          pdfStyles.tdMuted,
                          { width: COL_WIDTHS.grade.weight },
                        ]}
                      >
                        {a.weight}
                      </Text>
                      <Text
                        style={[
                          pdfStyles.tdMuted,
                          { width: COL_WIDTHS.grade.feedback },
                        ]}
                      >
                        {a.feedback ?? "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            Mathabah Institute · Confidential
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
