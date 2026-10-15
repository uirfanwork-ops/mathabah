/**
 * Role-specific registration answers, stored in the auth user's metadata at
 * sign-up. `requested_role` is only a request — the real `profiles.role` is
 * set by an admin on approval, so nobody can grant themselves a role.
 */
export type RequestedRole = "student" | "teacher";

export interface RegistrationDetails {
  phone?: string;
  // student
  date_of_birth?: string;
  gender?: string;
  guardian_name?: string;
  guardian_phone?: string;
  program_interest?: string;
  // teacher
  specialization?: string;
  qualifications?: string;
  years_experience?: string;
  subjects?: string;
  bio?: string;
}

export const STUDENT_FIELDS = [
  "phone",
  "date_of_birth",
  "gender",
  "guardian_name",
  "guardian_phone",
  "program_interest",
] as const;

export const TEACHER_FIELDS = [
  "phone",
  "specialization",
  "qualifications",
  "years_experience",
  "subjects",
  "bio",
] as const;

export const REQUIRED: Record<RequestedRole, readonly string[]> = {
  student: ["phone", "date_of_birth"],
  teacher: ["phone", "specialization", "qualifications", "years_experience"],
};

export const FIELD_LABELS: Record<string, string> = {
  phone: "Phone",
  date_of_birth: "Date of birth",
  gender: "Gender",
  guardian_name: "Parent / guardian name",
  guardian_phone: "Parent / guardian phone",
  program_interest: "Program of interest",
  specialization: "Area of specialization",
  qualifications: "Qualifications / ijazahs",
  years_experience: "Years of teaching experience",
  subjects: "Subjects able to teach",
  bio: "About / teaching background",
};

/** Read the registration answers back out of auth user metadata. */
export function readRegistration(meta: Record<string, any> | null | undefined): {
  requestedRole: RequestedRole | null;
  details: RegistrationDetails;
} {
  const r = meta?.requested_role;
  return {
    requestedRole: r === "teacher" || r === "student" ? r : null,
    details: (meta?.registration ?? {}) as RegistrationDetails,
  };
}
