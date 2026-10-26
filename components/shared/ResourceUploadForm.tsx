"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

import { addCourseResource } from "@/lib/teacher/actions";
import { adminAddCourseResource } from "@/lib/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Upload a document (PDF, Word, image, …) or share a link with a course.
 * Files go straight from the browser to private storage via a signed URL,
 * then the resource row is created and enrolled students are notified.
 */
export function ResourceUploadForm({
  courseId,
  mode,
}: {
  courseId: string;
  mode: "teacher" | "admin";
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file") as File | null;
    const linkUrl = String(fd.get("link_url") ?? "").trim();
    const name = String(fd.get("name") ?? "").trim();

    if (!name) return setMessage({ ok: false, text: "Please give the resource a name." });
    if ((!file || file.size === 0) && !linkUrl) {
      return setMessage({ ok: false, text: "Choose a file to upload or paste a link." });
    }

    startTransition(async () => {
      try {
        let fileUrl: string | null = null;
        if (file && file.size > 0) {
          setProgress("Preparing upload…");
          const res = await fetch("/api/resources/upload-url", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ course_id: courseId, filename: file.name, size: file.size }),
          });
          const info = await res.json();
          if (!res.ok) throw new Error(info.error ?? "Could not start upload");

          setProgress(`Uploading ${file.name}…`);
          const { error } = await createClient()
            .storage.from("course-resources")
            .uploadToSignedUrl(info.path, info.token, file, {
              contentType: file.type || "application/octet-stream",
            });
          if (error) throw new Error(error.message);
          fileUrl = info.file_url;
        }

        setProgress("Saving…");
        const payload = new FormData();
        payload.set("course_id", courseId);
        payload.set("name", name);
        payload.set("description", String(fd.get("description") ?? ""));
        if (fileUrl) payload.set("file_url", fileUrl);
        if (linkUrl) payload.set("link_url", linkUrl);
        if (mode === "admin") await adminAddCourseResource(payload);
        else await addCourseResource(payload);

        form.reset();
        setMessage({ ok: true, text: "Shared with the class — students have been notified." });
        router.refresh();
      } catch (err) {
        setMessage({ ok: false, text: err instanceof Error ? err.message : "Upload failed" });
      } finally {
        setProgress(null);
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-4"
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
        Share a document or link
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`res-name-${courseId}`}>Name</Label>
          <Input id={`res-name-${courseId}`} name="name" required placeholder="Week 1 handout" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`res-file-${courseId}`}>Upload file</Label>
          <Input
            id={`res-file-${courseId}`}
            name="file"
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt,.zip,image/*,audio/*,video/*"
            className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-brand-crimson file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-parchment"
          />
          <p className="text-xs text-muted-foreground">PDF, Word, PowerPoint, images… up to 50 MB.</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`res-link-${courseId}`}>Or paste a link</Label>
          <Input
            id={`res-link-${courseId}`}
            name="link_url"
            type="url"
            placeholder="https://… (YouTube, Google Doc, article)"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`res-desc-${courseId}`}>Note for students (optional)</Label>
          <Textarea id={`res-desc-${courseId}`} name="description" rows={2} />
        </div>
      </div>
      {message && (
        <Alert variant={message.ok ? "success" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-end gap-3">
        {progress && <span className="text-sm text-muted-foreground">{progress}</span>}
        <Button type="submit" disabled={isPending}>
          <UploadCloud className="mr-2 h-4 w-4" />
          {isPending ? "Working…" : "Share with class"}
        </Button>
      </div>
    </form>
  );
}
