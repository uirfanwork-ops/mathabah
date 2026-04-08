import Link from "next/link";
import { notFound } from "next/navigation";

import { TeacherForm } from "@/components/admin/TeacherForm";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { formatDate, getInitials } from "@/lib/utils";

export const metadata = { title: "Teacher profile" };

export default async function TeacherProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select(
      `id, employee_number, bio, specialization, qualifications, hire_date, profile_id,
       profiles!inner(id, full_name, email, phone, status, created_at, display_id)`,
    )
    .eq("id", params.id)
    .single();

  if (!teacher) notFound();

  const profile = (teacher as any).profiles;

  const [{ data: courses }, { data: reports }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, code, schedule, is_active")
      .eq("teacher_id", teacher.id)
      .order("name"),
    supabase
      .from("teacher_reports")
      .select(
        "id, type, title, created_at, is_visible_to_student, student:students(id, profiles(full_name))",
      )
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/teachers"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to teachers
      </Link>

      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-gold/10 text-2xl text-brand-gold">
          {getInitials(profile.full_name)}
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-brand-parchment">
            {profile.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <div className="mt-1 flex items-center gap-2">
            {profile.display_id && (
              <Badge variant="outline" className="font-mono">
                {profile.display_id}
              </Badge>
            )}
            <Badge variant="success">{profile.status}</Badge>
            {teacher.employee_number && (
              <Badge variant="outline">#{teacher.employee_number}</Badge>
            )}
            {teacher.specialization && (
              <Badge variant="default">{teacher.specialization}</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="reports">Reports submitted</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile information</CardTitle>
            </CardHeader>
            <CardContent>
              <TeacherForm
                teacher={{
                  id: teacher.id,
                  employee_number: teacher.employee_number,
                  bio: teacher.bio,
                  specialization: teacher.specialization,
                  qualifications: teacher.qualifications,
                  hire_date: teacher.hire_date,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Courses taught</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(courses ?? []).length === 0 ? (
                    <TableEmpty colSpan={4}>
                      Not assigned to any courses yet.
                    </TableEmpty>
                  ) : (
                    (courses ?? []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs text-brand-gold">
                          {c.code ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/courses/${c.id}`}
                            className="text-brand-goldlight hover:underline"
                          >
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.schedule ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.is_active ? "success" : "secondary"}>
                            {c.is_active ? "active" : "archived"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reports submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Visible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reports ?? []).length === 0 ? (
                    <TableEmpty colSpan={5}>No reports submitted.</TableEmpty>
                  ) : (
                    (reports ?? []).map((r: any) => {
                      const student = Array.isArray(r.student)
                        ? r.student[0]
                        : r.student;
                      const studentProfile = Array.isArray(student?.profiles)
                        ? student?.profiles[0]
                        : student?.profiles;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(r.created_at)}
                          </TableCell>
                          <TableCell>
                            {studentProfile?.full_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-brand-goldlight">
                            {r.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {r.is_visible_to_student ? (
                              <Badge variant="success">visible</Badge>
                            ) : (
                              <Badge variant="secondary">internal</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
