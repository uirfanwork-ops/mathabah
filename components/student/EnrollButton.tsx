"use client";

import { useTransition } from "react";

import { requestEnrollment } from "@/lib/student/actions";
import { Button } from "@/components/ui/button";

export function EnrollButton({ courseId }: { courseId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        formData.set("course_id", courseId);
        startTransition(() => requestEnrollment(formData));
      }}
    >
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isPending}
        className="h-7 text-xs"
      >
        {isPending ? "Enrolling…" : "Enroll"}
      </Button>
    </form>
  );
}
