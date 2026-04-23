import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardWorkspace } from "@/components/DashboardWorkspace";
import { getAccessCookieName, readEmailFromAccessToken } from "@/lib/access";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAccessCookieName())?.value;
  const email = readEmailFromAccessToken(token);

  if (!email) {
    redirect("/?paywall=locked");
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 pt-8 sm:px-8 lg:px-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-cyan-300">Local SEO Rank Tracker</p>
        <h1 className="text-3xl font-semibold text-white">Neighborhood ranking dashboard</h1>
        <p className="max-w-2xl text-slate-300">
          Monitor your Google Maps position, compare local competitors, and identify where to focus
          your SEO improvements this week.
        </p>
      </header>

      <DashboardWorkspace email={email} />
    </main>
  );
}
