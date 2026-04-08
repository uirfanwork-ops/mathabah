"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentTabsProps {
  profile: React.ReactNode;
  enrollments: React.ReactNode;
  grades: React.ReactNode;
  payments: React.ReactNode;
  reports: React.ReactNode;
}

export function StudentTabs(props: StudentTabsProps) {
  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
        <TabsTrigger value="grades">Grades</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">{props.profile}</TabsContent>
      <TabsContent value="enrollments">{props.enrollments}</TabsContent>
      <TabsContent value="grades">{props.grades}</TabsContent>
      <TabsContent value="payments">{props.payments}</TabsContent>
      <TabsContent value="reports">{props.reports}</TabsContent>
    </Tabs>
  );
}
