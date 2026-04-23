import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

import type { CompetitorEntry } from "@/lib/types";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseRatingAndReviews(text: string): {
  rating: number | null;
  reviewCount: number | null;
} {
  const ratingMatch = text.match(/(\d(?:\.\d)?)/);
  const reviewsMatch = text.match(/\((\d[\d,]*)\)/);

  return {
    rating: ratingMatch ? Number.parseFloat(ratingMatch[1]) : null,
    reviewCount: reviewsMatch
      ? Number.parseInt(reviewsMatch[1].replace(/,/g, ""), 10)
      : null
  };
}

function visibilityFromPosition(position: number | null): number {
  if (!position) {
    return 0;
  }

  if (position <= 3) {
    return 100 - (position - 1) * 12;
  }

  if (position <= 10) {
    return Math.max(0, 70 - (position - 4) * 8);
  }

  return 5;
}

function extractOrganicResults(
  $: cheerio.CheerioAPI,
  maxResults: number
): CompetitorEntry[] {
  const items: CompetitorEntry[] = [];

  $("#search .g").each((_, element) => {
    if (items.length >= maxResults) {
      return;
    }

    const name = $(element).find("h3").first().text().trim();
    const url = $(element).find("a").first().attr("href")?.trim() ?? null;

    if (!name) {
      return;
    }

    items.push({
      name,
      url,
      position: items.length + 1,
      rating: null,
      reviewCount: null,
      address: null,
      isTarget: false
    });
  });

  return items;
}

function extractLocalPackResults(
  $: cheerio.CheerioAPI,
  maxResults: number
): CompetitorEntry[] {
  const items: CompetitorEntry[] = [];
  const localSelectors = ["div.VkpGBb", "div.wHYlTd", "div.rllt__details"];

  for (const selector of localSelectors) {
    if (items.length >= maxResults) {
      break;
    }

    $(selector).each((_, element) => {
      if (items.length >= maxResults) {
        return;
      }

      const name =
        $(element).find(".dbg0pd, .OSrXXb, .qBF1Pd").first().text().trim() ||
        $(element).find("a").first().text().trim();
      const url = $(element).find("a").first().attr("href")?.trim() ?? null;
      const snippet = $(element).text().replace(/\s+/g, " ").trim();
      const address =
        $(element)
          .find(".rllt__details > div:nth-child(2), .W4Efsd span")
          .first()
          .text()
          .trim() || null;

      if (!name) {
        return;
      }

      const ratingData = parseRatingAndReviews(snippet);

      items.push({
        name,
        url,
        position: items.length + 1,
        rating: ratingData.rating,
        reviewCount: ratingData.reviewCount,
        address,
        isTarget: false
      });
    });
  }

  return items;
}

export async function scrapeLocalKeywordRankings(params: {
  keyword: string;
  neighborhood: string;
  targetBusinessName: string;
  maxResults?: number;
}): Promise<{
  targetPosition: number | null;
  visibilityScore: number;
  competitors: CompetitorEntry[];
}> {
  const maxResults = params.maxResults ?? 8;
  const searchQuery = `${params.keyword} near ${params.neighborhood}`;
  const searchUrl = `https://www.google.com/search?hl=en&gl=us&num=20&q=${encodeURIComponent(searchQuery)}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    await page.waitForSelector("body", { timeout: 10000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    const localPack = extractLocalPackResults($, maxResults);
    const organic = extractOrganicResults($, maxResults);

    const merged = [...localPack, ...organic].slice(0, maxResults);
    const deduped: CompetitorEntry[] = [];
    const seen = new Set<string>();

    for (const item of merged) {
      const dedupeKey = normalizeText(`${item.name}::${item.url ?? ""}`);
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      deduped.push(item);
    }

    const targetName = normalizeText(params.targetBusinessName);
    const withTargetFlag = deduped.map((entry, index) => {
      const normalized = normalizeText(entry.name);
      const isTarget =
        normalized.includes(targetName) ||
        targetName.includes(normalized) ||
        (entry.url ? normalizeText(entry.url).includes(targetName) : false);

      return {
        ...entry,
        position: index + 1,
        isTarget
      };
    });

    const targetMatch = withTargetFlag.find((entry) => entry.isTarget);

    return {
      targetPosition: targetMatch?.position ?? null,
      visibilityScore: visibilityFromPosition(targetMatch?.position ?? null),
      competitors: withTargetFlag
    };
  } finally {
    await browser.close();
  }
}
