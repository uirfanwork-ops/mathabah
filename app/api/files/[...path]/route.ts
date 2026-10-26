import { NextResponse } from "next/server";

import { RESOURCE_BUCKET, FILE_ROUTE_PREFIX } from "@/lib/resources/access";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/files/<course>/<uuid>/<name>
 * The bucket is private. We check the caller can see the resource row that
 * points at this file (RLS: admins, the course's teacher, enrolled students),
 * then hand them a short-lived signed download link.
 */
export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } },
) {
  const path = params.path.map(decodeURIComponent).join("/");
  const fileUrl = FILE_ROUTE_PREFIX + path;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(`/auth/login?next=${encodeURIComponent(fileUrl)}`, _request.url),
    );
  }

  const { data: resource } = await supabase
    .from("course_resources")
    .select("id")
    .eq("file_url", fileUrl)
    .maybeSingle();
  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const svc = createServiceRoleClient();
  const { data, error } = await svc.storage
    .from(RESOURCE_BUCKET)
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}
