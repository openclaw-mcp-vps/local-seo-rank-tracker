import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ACCESS_COOKIE_NAME, getAuthenticatedEmailFromToken } from "@/lib/access";
import {
  getBusinessByOwnerEmail,
  getRecentRankingChecks,
  getTrendPoints,
  listKeywordsForBusiness,
  replaceKeywordsForBusiness,
  saveBusinessProfile
} from "@/lib/database";
import { runRankingChecksForOwner } from "@/lib/ranking-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rankingConfigSchema = z.object({
  businessName: z.string().min(2),
  gmbName: z.string().min(2),
  website: z.string().trim().optional(),
  primaryCity: z.string().min(2),
  keywords: z
    .array(
      z.object({
        keyword: z.string().min(2),
        neighborhood: z.string().min(2)
      })
    )
    .min(1),
  runCheckNow: z.boolean().optional()
});

function getAuthenticatedEmail(request: NextRequest): string | null {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  return getAuthenticatedEmailFromToken(token);
}

export async function GET(request: NextRequest) {
  const ownerEmail = getAuthenticatedEmail(request);
  if (!ownerEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const business = getBusinessByOwnerEmail(ownerEmail);
  if (!business) {
    return NextResponse.json({
      business: null,
      keywords: [],
      trend: [],
      checks: []
    });
  }

  return NextResponse.json({
    business,
    keywords: listKeywordsForBusiness(business.id),
    trend: getTrendPoints(business.id, 16),
    checks: getRecentRankingChecks(business.id, 8)
  });
}

export async function POST(request: NextRequest) {
  const ownerEmail = getAuthenticatedEmail(request);
  if (!ownerEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = rankingConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const business = saveBusinessProfile(ownerEmail, {
    name: parsed.data.businessName,
    gmbName: parsed.data.gmbName,
    website: parsed.data.website,
    primaryCity: parsed.data.primaryCity
  });

  replaceKeywordsForBusiness(business.id, parsed.data.keywords);

  if (parsed.data.runCheckNow) {
    await runRankingChecksForOwner(ownerEmail);
  }

  return NextResponse.json({
    success: true,
    business,
    keywords: listKeywordsForBusiness(business.id),
    trend: getTrendPoints(business.id, 16),
    checks: getRecentRankingChecks(business.id, 8)
  });
}
