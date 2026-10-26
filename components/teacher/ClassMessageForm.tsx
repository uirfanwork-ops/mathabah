"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";

import { postCourseMessage } from "@/lib/teacher/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Send a message to every student enrolled in the course (portal + email). */
export function ClassMessageForm({ courseId, studentCount }: { courseId: string; studentCount: number }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      action={(fd) => {
        setMessage(null);
        fd.set("course_id", courseId);
        startTransition(async () => {
          try {
            await postCourseMessage(fd);
            (document.getElementById(`msg-form-${courseId}`) as HTMLFormElement | null)?.reset();
            setMessage({ ok: true, text: `Sent to ${studentCount} student${studentCount === 1 ? "" : "s"} (portal + email).` });
          } catch (e) {
            setMessage({ ok: false, text: e instanceof Error ? e.message : "Failed to send" });
          }
        });
      }}
      id={`msg-form-${courseId}`}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor={`msg-title-${courseId}`}>Subject</Label>
        <Input id={`msg-title-${courseId}`} name="title" required placeholder="Class cancelled this Thursday" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`msg-body-${courseId}`}>Message</Label>
        <Textarea id={`msg-body-${courseId}`} name="body" rows={4} required placeholder="Write to the whole class…" />
      </div>
      {message && (
        <Alert variant={message.ok ? "success" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={isPending || studentCount === 0}>
        <Send className="mr-2 h-4 w-4" />
        {isPending ? "Sending…" : "Send to class"}
      </Button>
    </form>
  );
}
