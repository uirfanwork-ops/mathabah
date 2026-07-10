// Shared assessment categories. Admins/teachers pick one when creating an
// assessment; the student & staff views group assessments under these headings.
//
// `value` is what's stored in assessments.category (lowercase, stable);
// `label` is the human-facing heading.

export const ASSESSMENT_CATEGORIES = [
  { value: "exam", label: "Exams" },
  { value: "test", label: "Tests" },
  { value: "quiz", label: "Quizzes" },
  { value: "assignment", label: "Assignments" },
  { value: "homework", label: "Homework" },
  { value: "reading", label: "Readings" },
  { value: "project", label: "Projects" },
  { value: "presentation", label: "Presentations" },
  { value: "participation", label: "Participation" },
  { value: "other", label: "Other" },
] as const;

export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number]["value"];

export const DEFAULT_ASSESSMENT_CATEGORY: AssessmentCategory = "assignment";

const LABEL_BY_VALUE = new Map<string, string>(
  ASSESSMENT_CATEGORIES.map((c) => [c.value, c.label]),
);
const ORDER_BY_VALUE = new Map<string, number>(
  ASSESSMENT_CATEGORIES.map((c, i) => [c.value, i]),
);

/** Heading for a category value, falling back to a title-cased raw value. */
export function categoryLabel(value: string | null | undefined): string {
  if (!value) return "Other";
  return (
    LABEL_BY_VALUE.get(value) ??
    value.charAt(0).toUpperCase() + value.slice(1)
  );
}

/** Sort key so groups render in the defined order; unknowns sort last. */
export function categoryOrder(value: string | null | undefined): number {
  if (!value) return ASSESSMENT_CATEGORIES.length;
  return ORDER_BY_VALUE.get(value) ?? ASSESSMENT_CATEGORIES.length;
}

/**
 * Group a list of assessments (each with an optional `category`) into ordered
 * buckets. Returns `[{ value, label, items }]` sorted by the canonical order.
 */
export function groupByCategory<T extends { category?: string | null }>(
  items: T[],
): { value: string; label: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = item.category || DEFAULT_ASSESSMENT_CATEGORY;
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => categoryOrder(a[0]) - categoryOrder(b[0]))
    .map(([value, list]) => ({
      value,
      label: categoryLabel(value),
      items: list,
    }));
}
