// Hand-rolled types for the Mathabah schema. Replace with `supabase gen types`
// once the Supabase project is provisioned and you can introspect the live DB.

export type UserRole = "admin" | "teacher" | "student";
export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: AccountStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  profile_id: string;
  student_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  emergency_contact: string | null;
  enrollment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  profile_id: string;
  employee_number: string | null;
  bio: string | null;
  specialization: string | null;
  qualifications: string | null;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
}
