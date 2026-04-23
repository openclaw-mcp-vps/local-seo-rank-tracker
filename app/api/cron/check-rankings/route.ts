import { NextRequest, NextResponse } from "next/server";

import {
  runScheduledRankingChecks,
  sendWeeklyReportsForAllBusinesses
} from "@/lib/ranking-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const requiredKey = process.env.CRON_SECRET;
  if (!requiredKey) {
    return true;
  }

  const provided =
    request.headers.get("x-cron-key") ?? request.nextUrl.searchParams.get("key") ?? "";

  return provided === requiredKey;
}

async function runCron(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rankingResult = await runScheduledRankingChecks();
  const reportResult =
    request.nextUrl.searchParams.get("sendReports") === "1"
      ? await sendWeeklyReportsForAllBusinesses()
      : { delivered: 0 };

  return NextResponse.json({
    success: true,
    rankings: rankingResult,
    reports: reportResult
  });
}

export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}
