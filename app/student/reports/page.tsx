import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Reports · Student" };

const TYPE_LABEL: Record<string, string> = {
  mid_course: "Mid-course",
  end_of_course: "End of course",
  concern: "Concern",
};

export default async function StudentReportsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!student) redirect("/dashboard");

  // RLS already blocks reports where is_visible_to_student = false,
  // but filter explicitly as a belt-and-braces guard.
  const { data: reports } = await supabase
    .from("teacher_reports")
    .select(
      "id, title, content, type, created_at, courses(name, code), teachers(profiles(full_name))",
    )
    .eq("student_id", student.id)
    .eq("is_visible_to_student", true)
    .order("created_at", { ascending: false });

  const rows = reports ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          Reports
        </h1>
        <p className="text-muted-foreground">
          Teacher feedback your instructor has chosen to share with you.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No reports have been shared with you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const course = Array.isArray((r as any).courses)
              ? (r as any).courses[0]
              : (r as any).courses;
            const teacher = Array.isArray((r as any).teachers)
              ? (r as any).teachers[0]
              : (r as any).teachers;
            const teacherProfile = Array.isArray(teacher?.profiles)
              ? teacher?.profiles[0]
              : teacher?.profiles;
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{r.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {teacherProfile?.full_name ?? "Teacher"}
                      {course?.name
                        ? ` · ${course.code ? `${course.code} — ` : ""}${course.name}`
                        : ""}
                      {" · "}
                      {formatDate(r.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant={r.type === "concern" ? "destructive" : "outline"}
                  >
                    {TYPE_LABEL[r.type] ?? r.type}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {r.content}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
