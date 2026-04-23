import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAccessCookieName, readEmailFromAccessToken } from "@/lib/access";
import { getDashboardKeywords } from "@/lib/database";
import { enqueueRankingCheck, ensureQueueInfrastructure } from "@/lib/queue";

export const runtime = "nodejs";

const rankingRequestSchema = z.object({
  keyword: z.string().trim().min(2).max(120),
  trackedBusiness: z.string().trim().min(2).max(140),
  location: z.object({
    name: z.string().trim().min(2).max(120),
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
    radiusKm: z.number().gt(0).lte(50),
  }),
});

async function getAuthorizedEmail() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAccessCookieName())?.value;

  return readEmailFromAccessToken(token);
}

export async function GET() {
  const email = await getAuthorizedEmail();

  if (!email) {
    return NextResponse.json(
      {
        error: "Access cookie is missing or invalid.",
      },
      { status: 401 },
    );
  }

  await ensureQueueInfrastructure();

  return NextResponse.json({
    email,
    keywords: getDashboardKeywords(email),
  });
}

export async function POST(request: Request) {
  const email = await getAuthorizedEmail();

  if (!email) {
    return NextResponse.json(
      {
        error: "Access cookie is missing or invalid.",
      },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = rankingRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Submit a keyword, tracked business name, and a valid location.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const result = await enqueueRankingCheck({
    ownerEmail: email,
    keyword: parsed.data.keyword,
    trackedBusiness: parsed.data.trackedBusiness,
    location: parsed.data.location,
  });

  return NextResponse.json({
    email,
    run: result,
    keywords: getDashboardKeywords(email),
  });
}
