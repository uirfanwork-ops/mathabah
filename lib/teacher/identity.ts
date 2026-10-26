import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Resolve the `teachers` row for the signed-in user. Admins may act as a
 * teacher for any course, so they get a teachers row created on demand and
 * `isAdmin` tells pages to skip the "only my courses" filter.
 */
export async function getTeacherIdentity(userId: string) {
  const svc = createServiceRoleClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  let { data: teacher } = await svc
    .from("teachers")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!teacher && isAdmin) {
    const { data } = await svc
      .from("teachers")
      .upsert({ profile_id: userId }, { onConflict: "profile_id" })
      .select("id")
      .single();
    teacher = data;
  }
  return { teacher: (teacher ?? null) as { id: string } | null, isAdmin };
}

/** Apply "only this teacher's courses" unless the user is an admin. */
export function onlyMine<Q>(
  q: Q,
  isAdmin: boolean,
  column: string,
  teacherId: string,
): Q {
  return isAdmin ? q : (q as any).eq(column, teacherId);
}
