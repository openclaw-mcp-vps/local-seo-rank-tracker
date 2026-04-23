import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CompetitorTable } from "@/components/competitor-table";
import { RankingChart } from "@/components/ranking-chart";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAuthenticatedEmailFromCookies } from "@/lib/access";
import {
  getBusinessByOwnerEmail,
  getRecentRankingChecks,
  getTrendPoints,
  listKeywordsForBusiness,
  replaceKeywordsForBusiness,
  saveBusinessProfile
} from "@/lib/database";
import { runRankingChecksForOwner, sendWeeklyReportForOwner } from "@/lib/ranking-service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  businessName: z.string().min(2),
  gmbName: z.string().min(2),
  website: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : "")),
  primaryCity: z.string().min(2),
  keywords: z.string().min(2)
});

function parseKeywords(raw: string, fallbackCity: string) {
  const seen = new Set<string>();
  const parsed: Array<{ keyword: string; neighborhood: string }> = [];

  for (const line of raw.split("\n")) {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      continue;
    }

    const parts = normalizedLine.split("::").map((part) => part.trim());
    const keyword = parts[0];
    const neighborhood = parts[1] || fallbackCity;

    if (!keyword) {
      continue;
    }

    const dedupe = `${keyword.toLowerCase()}::${neighborhood.toLowerCase()}`;
    if (seen.has(dedupe)) {
      continue;
    }

    seen.add(dedupe);
    parsed.push({ keyword, neighborhood });
  }

  return parsed;
}

async function saveBusinessAction(formData: FormData) {
  "use server";

  const ownerEmail = await getAuthenticatedEmailFromCookies();
  if (!ownerEmail) {
    redirect("/");
  }

  const parsed = profileSchema.safeParse({
    businessName: formData.get("businessName"),
    gmbName: formData.get("gmbName"),
    website: formData.get("website"),
    primaryCity: formData.get("primaryCity"),
    keywords: formData.get("keywords")
  });

  if (!parsed.success) {
    redirect("/dashboard?error=invalid_profile");
  }

  const profile = saveBusinessProfile(ownerEmail, {
    name: parsed.data.businessName,
    gmbName: parsed.data.gmbName,
    website: parsed.data.website,
    primaryCity: parsed.data.primaryCity
  });

  const keywords = parseKeywords(parsed.data.keywords, parsed.data.primaryCity);
  if (keywords.length === 0) {
    redirect("/dashboard?error=keyword_required");
  }

  replaceKeywordsForBusiness(profile.id, keywords);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

async function runManualCheckAction() {
  "use server";

  const ownerEmail = await getAuthenticatedEmailFromCookies();
  if (!ownerEmail) {
    redirect("/");
  }

  await runRankingChecksForOwner(ownerEmail);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

async function sendWeeklyEmailAction() {
  "use server";

  const ownerEmail = await getAuthenticatedEmailFromCookies();
  if (!ownerEmail) {
    redirect("/");
  }

  await sendWeeklyReportForOwner(ownerEmail);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export default async function DashboardPage() {
  const ownerEmail = await getAuthenticatedEmailFromCookies();
  if (!ownerEmail) {
    redirect("/");
  }

  const business = getBusinessByOwnerEmail(ownerEmail);
  const keywords = business ? listKeywordsForBusiness(business.id) : [];
  const trend = business ? getTrendPoints(business.id, 16) : [];
  const checks = business ? getRecentRankingChecks(business.id, 6) : [];
  const latestCheck = checks[0] ?? null;
  const lastRunAt = latestCheck
    ? new Date(latestCheck.checkedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : "No checks yet";

  const avgPosition = latestCheck
    ? (
        latestCheck.results.reduce((sum, item) => sum + (item.targetPosition ?? 21), 0) /
        Math.max(latestCheck.results.length, 1)
      ).toFixed(1)
    : "-";
  const visibilityScore = latestCheck
    ? (
        latestCheck.results.reduce((sum, item) => sum + item.visibilityScore, 0) /
        Math.max(latestCheck.results.length, 1)
      ).toFixed(1)
    : "-";

  const keywordTemplate = keywords
    .map((keyword) => `${keyword.keyword} :: ${keyword.neighborhood}`)
    .join("\n");

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-300">Paywalled Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">Local Ranking Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">Signed in as {ownerEmail}</p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className={cn(buttonVariants({ variant: "outline" }), "text-sm")}
          >
            Log out
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Tracked keywords</CardDescription>
            <CardTitle className="text-3xl">{keywords.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average rank</CardDescription>
            <CardTitle className="text-3xl">{avgPosition}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Visibility score</CardDescription>
            <CardTitle className="text-3xl">{visibilityScore}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Performance trend</CardTitle>
            <CardDescription>Latest check: {lastRunAt}</CardDescription>
          </CardHeader>
          <CardContent>
            <RankingChart trend={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Run checks after GBP updates and send reports to keep your team aligned.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={runManualCheckAction}>
              <button type="submit" className={cn(buttonVariants(), "w-full")}> 
                Run Ranking Check Now
              </button>
            </form>
            <form action={sendWeeklyEmailAction}>
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
              >
                Send Weekly Report Now
              </button>
            </form>
            <p className="text-xs text-slate-400">
              Scheduled checks can call <code>/api/cron/check-rankings</code> from your cron platform.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Business profile & keyword map</CardTitle>
          <CardDescription>
            Use one line per keyword in the format: keyword :: neighborhood. If no neighborhood is provided, your primary city is used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveBusinessAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="businessName" className="text-sm font-medium text-slate-200">
                  Business Name
                </label>
                <Input
                  id="businessName"
                  name="businessName"
                  required
                  defaultValue={business?.name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="gmbName" className="text-sm font-medium text-slate-200">
                  Google Business Profile Name
                </label>
                <Input id="gmbName" name="gmbName" required defaultValue={business?.gmbName ?? ""} />
              </div>
              <div className="space-y-2">
                <label htmlFor="website" className="text-sm font-medium text-slate-200">
                  Website URL
                </label>
                <Input id="website" name="website" type="url" defaultValue={business?.website ?? ""} />
              </div>
              <div className="space-y-2">
                <label htmlFor="primaryCity" className="text-sm font-medium text-slate-200">
                  Primary City
                </label>
                <Input
                  id="primaryCity"
                  name="primaryCity"
                  required
                  defaultValue={business?.primaryCity ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="keywords" className="text-sm font-medium text-slate-200">
                Keywords
              </label>
              <Textarea
                id="keywords"
                name="keywords"
                required
                rows={8}
                defaultValue={keywordTemplate}
              />
            </div>

            <button type="submit" className={cn(buttonVariants())}>
              Save Profile and Keywords
            </button>
          </form>
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold text-slate-100">Competitor analysis</h2>
        <CompetitorTable rows={latestCheck?.results ?? []} />
      </section>
    </main>
  );
}
