"use client";

import { useState, useTransition } from "react";
import { ExternalLink, FileText, Trash2 } from "lucide-react";

import {
  adminAddCourseResource,
  adminDeleteCourseResource,
} from "@/lib/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Resource {
  id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  link_url: string | null;
  created_at: string;
}

interface AdminResourceManagerProps {
  courseId: string;
  resources: Resource[];
}

export function AdminResourceManager({
  courseId,
  resources,
}: AdminResourceManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <form
        action={(formData) => {
          formData.set("course_id", courseId);
          setMessage(null);
          startTransition(async () => {
            try {
              await adminAddCourseResource(formData);
              (
                document.getElementById(
                  "admin-resource-form",
                ) as HTMLFormElement
              )?.reset();
              setMessage("Resource added.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Failed");
            }
          });
        }}
        id="admin-resource-form"
        className="rounded-lg border p-4"
      >
        <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Add resource
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Name</Label>
            <Input
              id="r-name"
              name="name"
              required
              placeholder="Lecture notes — Week 1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-link_url">Link URL</Label>
            <Input
              id="r-link_url"
              name="link_url"
              type="url"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-file_url">File URL</Label>
            <Input
              id="r-file_url"
              name="file_url"
              type="url"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-description">Description</Label>
            <Textarea
              id="r-description"
              name="description"
              rows={1}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={isPending}
          >
            {isPending ? "Adding…" : "Add resource"}
          </Button>
        </div>
      </form>

      {message && (
        <Alert
          variant={message === "Resource added." ? "success" : "destructive"}
        >
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {resources.length === 0 ? (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No resources uploaded for this course yet.
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => {
            const url = r.file_url ?? r.link_url;
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-md border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {r.file_url ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {r.name}
                      </a>
                    ) : (
                      <span className="text-sm font-medium">{r.name}</span>
                    )}
                    {r.description && (
                      <p className="text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </div>
                </div>
                <form
                  action={(formData) => {
                    formData.set("id", r.id);
                    formData.set("course_id", courseId);
                    startDeleting(async () => {
                      try {
                        await adminDeleteCourseResource(formData);
                      } catch (e) {
                        setMessage(
                          e instanceof Error ? e.message : "Failed to delete",
                        );
                      }
                    });
                  }}
                >
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
