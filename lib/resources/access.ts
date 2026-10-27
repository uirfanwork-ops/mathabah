import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const RESOURCE_BUCKET = "course-resources";
export const FILE_ROUTE_PREFIX = "/api/files/";

/**
 * Who the current user is for course-management purposes. Admins may manage
 * any course; teachers only the courses assigned to them. Admins get a
 * `teachers` row created on demand so they can act as a teacher anywhere.
 */
export async function getCourseManager() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, status, full_name")
    .eq("id", user.id)
    .single();
  if (!profile || profile.status !== "approved") return null;
  if (profile.role !== "admin" && profile.role !== "teacher") return null;

  const svc = createServiceRoleClient();
  let { data: teacher } = await svc
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!teacher && profile.role === "admin") {
    const { data } = await svc
      .from("teachers")
      .upsert({ profile_id: user.id }, { onConflict: "profile_id" })
      .select("id")
      .single();
    teacher = data;
  }
  if (!teacher) return null;

  return {
    supabase,
    userId: user.id,
    fullName: profile.full_name as string,
    isAdmin: profile.role === "admin",
    teacherId: teacher.id as string,
  };
}

/** True if this user may manage (upload to, grade, etc.) the course. */
export async function canManageCourse(
  mgr: NonNullable<Awaited<ReturnType<typeof getCourseManager>>>,
  courseId: string,
) {
  if (mgr.isAdmin) return true;
  const { data } = await mgr.supabase
    .from("courses")
    .select("teacher_id")
    .eq("id", courseId)
    .maybeSingle();
  return !!data && data.teacher_id === mgr.teacherId;
}

/** Delete the stored object behind a resource's file_url (no-op for links). */
export async function removeStoredFile(fileUrl: string | null | undefined) {
  if (!fileUrl || !fileUrl.startsWith(FILE_ROUTE_PREFIX)) return;
  const path = fileUrl.slice(FILE_ROUTE_PREFIX.length);
  try {
    await createServiceRoleClient().storage.from(RESOURCE_BUCKET).remove([path]);
  } catch (e) {
    console.warn("[removeStoredFile] failed", path, e);
  }
}

/** Every object path in the resources bucket (walks the folder tree). */
export async function listAllStoredFiles(): Promise<string[]> {
  const storage = createServiceRoleClient().storage.from(RESOURCE_BUCKET);
  const out: string[] = [];
  async function walk(prefix: string) {
    const { data } = await storage.list(prefix, { limit: 1000 });
    for (const item of data ?? []) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      // Folders come back without an id; files have one.
      if (item.id) out.push(full);
      else await walk(full);
    }
  }
  await walk("");
  return out;
}
