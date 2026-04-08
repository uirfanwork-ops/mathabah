import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseEditForm } from "@/components/admin/CourseEditForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit course" };

export default async function EditCoursePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: course }, { data: programs }, { data: teachers }] =
    await Promise.all([
      supabase
        .from("courses")
        .select(
          "id, name, code, description, schedule, capacity, start_date, end_date, is_active, program_id, teacher_id",
        )
        .eq("id", params.id)
        .single(),
      supabase.from("programs").select("id, name").order("name"),
      supabase
        .from("teachers")
        .select("id, profiles!inner(full_name)")
        .order("created_at"),
    ]);

  if (!course) notFound();

  const teacherOptions = (teachers ?? []).map((t: any) => ({
    id: t.id,
    full_name: Array.isArray(t.profiles)
      ? t.profiles[0]?.full_name
      : t.profiles?.full_name,
  }));

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/courses/${course.id}`}
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to course
      </Link>

      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Edit course
        </h1>
        <p className="text-muted-foreground">{course.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course details</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseEditForm
            course={course as any}
            programs={programs ?? []}
            teachers={teacherOptions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
