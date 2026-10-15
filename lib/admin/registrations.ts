import { createServiceRoleClient } from "@/lib/supabase/server";
import { readRegistration, type RegistrationDetails, type RequestedRole } from "@/lib/auth/registration";

export interface Registration {
  requestedRole: RequestedRole | null;
  details: RegistrationDetails;
}

/** Look up registration answers (stored in auth metadata) for profile ids. */
export async function getRegistrations(
  ids: string[],
): Promise<Record<string, Registration>> {
  const svc = createServiceRoleClient();
  const out: Record<string, Registration> = {};
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await svc.auth.admin.getUserById(id);
      out[id] = readRegistration(data?.user?.user_metadata);
    }),
  );
  return out;
}
