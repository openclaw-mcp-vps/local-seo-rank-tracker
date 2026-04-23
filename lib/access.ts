import { cookies } from "next/headers";

import { getSessionEmailForToken } from "@/lib/database";

export const ACCESS_COOKIE_NAME = "local_seo_rank_access";

export async function getAuthenticatedEmailFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getSessionEmailForToken(token);
}

export function getAuthenticatedEmailFromToken(token?: string): string | null {
  if (!token) {
    return null;
  }

  return getSessionEmailForToken(token);
}
