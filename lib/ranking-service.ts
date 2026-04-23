import {
  getBusinessById,
  getBusinessByOwnerEmail,
  getLatestRankingCheck,
  hasActivePurchase,
  listBusinesses,
  listKeywordsForBusiness,
  saveRankingCheck
} from "@/lib/database";
import { sendWeeklyRankingEmail } from "@/lib/email-service";
import { scrapeLocalKeywordRankings } from "@/lib/google-scraper";
import type { RankingResultInput } from "@/lib/types";

export async function runRankingCheckForBusiness(
  businessId: string,
  source: string
): Promise<{ checkId: string | null; rowsChecked: number }> {
  const business = getBusinessById(businessId);
  if (!business) {
    return { checkId: null, rowsChecked: 0 };
  }

  const keywords = listKeywordsForBusiness(businessId);
  if (keywords.length === 0) {
    return { checkId: null, rowsChecked: 0 };
  }

  const rows: RankingResultInput[] = [];

  for (const keyword of keywords) {
    try {
      const scraped = await scrapeLocalKeywordRankings({
        keyword: keyword.keyword,
        neighborhood: keyword.neighborhood,
        targetBusinessName: business.gmbName,
        maxResults: 8
      });

      rows.push({
        keywordId: keyword.id,
        keyword: keyword.keyword,
        neighborhood: keyword.neighborhood,
        targetPosition: scraped.targetPosition,
        visibilityScore: scraped.visibilityScore,
        competitors: scraped.competitors
      });
    } catch {
      rows.push({
        keywordId: keyword.id,
        keyword: keyword.keyword,
        neighborhood: keyword.neighborhood,
        targetPosition: null,
        visibilityScore: 0,
        competitors: []
      });
    }
  }

  const checkId = saveRankingCheck({
    businessId,
    source,
    rows
  });

  return { checkId, rowsChecked: rows.length };
}

export async function runRankingChecksForOwner(ownerEmail: string) {
  const business = getBusinessByOwnerEmail(ownerEmail);
  if (!business) {
    return { checkId: null, rowsChecked: 0 };
  }

  return runRankingCheckForBusiness(business.id, "manual");
}

export async function runScheduledRankingChecks() {
  const businesses = listBusinesses();
  let businessesChecked = 0;
  let keywordRowsChecked = 0;

  for (const business of businesses) {
    if (!hasActivePurchase(business.ownerEmail)) {
      continue;
    }

    const result = await runRankingCheckForBusiness(business.id, "cron");
    if (result.checkId) {
      businessesChecked += 1;
      keywordRowsChecked += result.rowsChecked;
    }
  }

  return {
    businessesChecked,
    keywordRowsChecked
  };
}

export async function sendWeeklyReportForOwner(ownerEmail: string) {
  const business = getBusinessByOwnerEmail(ownerEmail);
  if (!business) {
    return { delivered: false, reason: "business_not_found" };
  }

  const latestCheck = getLatestRankingCheck(business.id);
  if (!latestCheck) {
    return { delivered: false, reason: "no_ranking_data" };
  }

  return sendWeeklyRankingEmail({
    to: ownerEmail,
    businessName: business.name,
    check: latestCheck
  });
}

export async function sendWeeklyReportsForAllBusinesses() {
  const businesses = listBusinesses();
  let delivered = 0;

  for (const business of businesses) {
    if (!hasActivePurchase(business.ownerEmail)) {
      continue;
    }

    const response = await sendWeeklyReportForOwner(business.ownerEmail);
    if (response.delivered) {
      delivered += 1;
    }
  }

  return { delivered };
}
