import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";

import { EnrollmentManager } from "@/components/admin/EnrollmentManager";
import { StudentForm } from "@/components/admin/StudentForm";
import { StudentTabs } from "@/components/admin/StudentTabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";

export const metadata = { title: "Student profile" };

export default async function StudentProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      `id, student_number, date_of_birth, gender,
       guardian_name, guardian_phone, guardian_email, emergency_contact,
       enrollment_date, notes, profile_id,
       profiles!inner(id, full_name, email, phone, status, created_at,
                      address, city, country)`,
    )
    .eq("id", params.id)
    .single();

  if (!student) notFound();

  const profile = (student as any).profiles;

  // Parallel fetch all child data
  const [
    { data: enrollments },
    { data: payments },
    { data: reports },
    { data: courses },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "id, status, enrolled_at, course:courses(id, name, code)",
      )
      .eq("student_id", student.id)
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount, currency, payment_date, method, reference")
      .eq("student_id", student.id)
      .order("payment_date", { ascending: false }),
    supabase
      .from("teacher_reports")
      .select(
        "id, type, title, content, is_visible_to_student, created_at, teacher:teachers(id, profiles(full_name))",
      )
      .eq("student_id", student.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("courses")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name"),
  ]);

  // Pull grades for the student via their enrollments
  const enrollmentIds = (enrollments ?? []).map((e: any) => e.id);
  let grades: any[] = [];
  if (enrollmentIds.length > 0) {
    const { data: g } = await supabase
      .from("grades")
      .select(
        "id, score, feedback, created_at, assessment:assessments(id, name, max_score, course_id), enrollment_id",
      )
      .in("enrollment_id", enrollmentIds)
      .order("created_at", { ascending: false });
    grades = g ?? [];
  }

  const enrolledCourseIds = new Set(
    (enrollments ?? []).map((e: any) => e.course?.id).filter(Boolean),
  );
  const availableCourses = (courses ?? []).filter(
    (c) => !enrolledCourseIds.has(c.id),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/students"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to students
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-gold/10 font-serif text-2xl text-brand-gold">
            {getInitials(profile.full_name)}
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
              {profile.full_name}
            </h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={profile.status === "approved" ? "success" : "warning"}
              >
                {profile.status}
              </Badge>
              {student.student_number && (
                <Badge variant="outline">#{student.student_number}</Badge>
              )}
            </div>
          </div>
        </div>
        <a
          href={`/api/pdf/student-report/${student.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-brand-gold/40 bg-brand-gold/10 px-4 py-2 text-sm font-medium text-brand-goldlight transition-colors hover:bg-brand-gold/20"
        >
          <FileText className="h-4 w-4" />
          Report card PDF
        </a>
      </div>

      <StudentTabs
        profile={
          <Card>
            <CardHeader>
              <CardTitle>Profile information</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentForm
                student={{
                  id: student.id,
                  student_number: student.student_number,
                  date_of_birth: student.date_of_birth,
                  gender: student.gender,
                  guardian_name: student.guardian_name,
                  guardian_phone: student.guardian_phone,
                  guardian_email: student.guardian_email,
                  emergency_contact: student.emergency_contact,
                  notes: student.notes,
                }}
                contact={{
                  address: profile.address,
                  city: profile.city,
                  country: profile.country,
                }}
              />
            </CardContent>
          </Card>
        }
        enrollments={
          <Card>
            <CardHeader>
              <CardTitle>Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              <EnrollmentManager
                studentId={student.id}
                enrollments={(enrollments ?? []).map((e: any) => ({
                  id: e.id,
                  status: e.status,
                  enrolled_at: e.enrolled_at,
                  course: Array.isArray(e.course) ? e.course[0] : e.course,
                }))}
                availableCourses={availableCourses}
              />
            </CardContent>
          </Card>
        }
        grades={
          <Card>
            <CardHeader>
              <CardTitle>Grades</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.length === 0 ? (
                    <TableEmpty colSpan={3}>No grades recorded yet.</TableEmpty>
                  ) : (
                    grades.map((g: any) => {
                      const a = Array.isArray(g.assessment)
                        ? g.assessment[0]
                        : g.assessment;
                      return (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium text-brand-goldlight">
                            {a?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            {g.score} / {a?.max_score ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(g.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        }
        payments={
          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payments ?? []).length === 0 ? (
                    <TableEmpty colSpan={5}>No payments recorded.</TableEmpty>
                  ) : (
                    (payments ?? []).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.payment_date)}</TableCell>
                        <TableCell className="font-medium text-brand-goldlight">
                          {formatCurrency(Number(p.amount), p.currency)}
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {p.method?.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.reference ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={`/api/pdf/payment-receipt/${p.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-goldlight hover:underline"
                          >
                            PDF →
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        }
        reports={
          <Card>
            <CardHeader>
              <CardTitle>Teacher reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(reports ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reports for this student yet.
                </p>
              ) : (
                (reports ?? []).map((r: any) => {
                  const teacher = Array.isArray(r.teacher)
                    ? r.teacher[0]
                    : r.teacher;
                  const teacherName = Array.isArray(teacher?.profiles)
                    ? teacher?.profiles[0]?.full_name
                    : teacher?.profiles?.full_name;
                  return (
                    <div
                      key={r.id}
                      className="rounded-md border border-brand-gold/15 bg-brand-ink/30 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-brand-goldlight">
                            {r.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {teacherName ?? "Unknown teacher"} •{" "}
                            {formatDate(r.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{r.type}</Badge>
                          {r.is_visible_to_student && (
                            <Badge variant="success">visible</Badge>
                          )}
                          <a
                            href={`/api/pdf/teacher-report/${r.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand-goldlight hover:underline"
                          >
                            PDF →
                          </a>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-foreground/90">
                        {r.content}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
