import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          Reports
        </h1>
        <p className="text-muted-foreground">
          Generate PDF reports for students and teachers.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 5</CardTitle>
          <CardDescription>
            PDF generation for student and teacher reports via{" "}
            <code>@react-pdf/renderer</code>. Reports will pull from contact
            info, enrollments, grades, payment history and teacher reports, then
            stream the PDF back as a download.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Endpoints: <code>/api/pdf/student-report</code>,{" "}
          <code>/api/pdf/teacher-report</code>.
        </CardContent>
      </Card>
    </div>
  );
}
