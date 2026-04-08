"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link as LinkIcon, Trash2 } from "lucide-react";

import {
  addCourseResource,
  deleteCourseResource,
} from "@/lib/teacher/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

interface Resource {
  id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  link_url: string | null;
  created_at: string;
}

/**
 * Client component rendered inside the teacher's course-detail Resources tab.
 * Lets the teacher add a new resource (file URL or external link) and remove
 * existing ones.
 */
export function CourseResources({
  courseId,
  resources,
}: {
  courseId: string;
  resources: Resource[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <form
        action={(formData) => {
          setError(null);
          formData.set("course_id", courseId);
          startTransition(async () => {
            try {
              await addCourseResource(formData);
              router.refresh();
              (document.getElementById(
                `resource-form-${courseId}`,
              ) as HTMLFormElement | null)?.reset();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed");
            }
          });
        }}
        id={`resource-form-${courseId}`}
        className="grid gap-4 rounded-md border border-brand-gold/15 bg-brand-ink/20 p-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Handout: Week 1 introduction"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file_url">File URL</Label>
            <Input
              id="file_url"
              name="file_url"
              placeholder="https://… (PDF, image, doc)"
              type="url"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="link_url">External link</Label>
            <Input
              id="link_url"
              name="link_url"
              placeholder="https://… (YouTube, Google Doc, article)"
              type="url"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Short note for students about this resource"
            />
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding…" : "Add resource"}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {resources.length === 0 ? (
          <p className="rounded-md border border-brand-gold/10 bg-brand-ink/20 p-4 text-sm text-muted-foreground">
            No resources yet. Add handouts, readings or links above.
          </p>
        ) : (
          resources.map((r) => {
            const href = r.file_url || r.link_url || "#";
            const Icon = r.file_url ? FileText : LinkIcon;
            return (
              <div
                key={r.id}
                className="flex items-start justify-between gap-4 rounded-md border border-brand-gold/15 bg-brand-ink/30 p-3"
              >
                <div className="flex flex-1 items-start gap-3">
                  <Icon className="mt-1 h-4 w-4 shrink-0 text-brand-gold" />
                  <div className="flex-1">
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-goldlight hover:underline"
                    >
                      {r.name}
                    </a>
                    {r.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {formatDate(r.created_at)}
                    </p>
                  </div>
                </div>
                <form
                  action={(formData) => {
                    formData.set("course_id", courseId);
                    startTransition(async () => {
                      try {
                        await deleteCourseResource(formData);
                        router.refresh();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Failed");
                      }
                    });
                  }}
                >
                  <input type="hidden" name="id" value={r.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-red-300 hover:text-red-200"
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
