import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import {
  RESOURCE_BUCKET,
  FILE_ROUTE_PREFIX,
  canManageCourse,
  getCourseManager,
} from "@/lib/resources/access";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 50 * 1024 * 1024;

/**
 * POST { course_id, filename, size }
 * Returns a one-time signed URL the browser uploads the file to directly
 * (so large files never pass through our server), plus the `file_url` to
 * store on the resource row.
 */
export async function POST(request: Request) {
  const mgr = await getCourseManager();
  if (!mgr) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  let body: { course_id?: string; filename?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const courseId = String(body.course_id ?? "");
  const filename = String(body.filename ?? "").trim();
  const size = Number(body.size ?? 0);
  if (!courseId || !filename) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (size > MAX_BYTES) {
    return NextResponse.json({ error: "Files must be 50 MB or smaller." }, { status: 400 });
  }
  if (!(await canManageCourse(mgr, courseId))) {
    return NextResponse.json({ error: "Course not assigned to you" }, { status: 403 });
  }

  const safeName = filename.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
  const path = `${courseId}/${randomUUID()}/${safeName}`;

  const svc = createServiceRoleClient();
  const { data, error } = await svc.storage
    .from(RESOURCE_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[upload-url] failed", error);
    return NextResponse.json({ error: "Could not start upload" }, { status: 500 });
  }

  return NextResponse.json({
    path: data.path,
    token: data.token,
    file_url: FILE_ROUTE_PREFIX + path,
  });
}
