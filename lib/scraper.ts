import type { CompetitorResult, LocationInput } from "@/lib/types";

type ScrapeParams = {
  keyword: string;
  location: LocationInput;
  maxResults?: number;
};

type RawCandidate = {
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string;
};

export async function scrapeGoogleMapsRankings({
  keyword,
  location,
  maxResults = 10,
}: ScrapeParams): Promise<CompetitorResult[]> {
  const puppeteer = await import("puppeteer");
  const query = `${keyword} ${location.name}`;
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${location.lat},${location.lng},13z?entry=ttu`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1080 });
    await page.goto(mapsUrl, { waitUntil: "networkidle2", timeout: 45_000 });
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const scraped = await page.evaluate((limit) => {
      const toNumber = (value: string) => {
        const parsed = Number(value.replace(/,/g, ""));
        return Number.isFinite(parsed) ? parsed : null;
      };

      const anchors = Array.from(
        document.querySelectorAll<HTMLAnchorElement>("a[href*='/maps/place']"),
      );

      const seen = new Set<string>();
      const rows: RawCandidate[] = [];

      for (const anchor of anchors) {
        const href = anchor.href;
        if (!href || seen.has(href)) {
          continue;
        }

        seen.add(href);

        const card =
          anchor.closest("div.Nv2PK") ||
          anchor.closest("div[role='article']") ||
          anchor.parentElement;

        const text = card?.textContent?.replace(/\s+/g, " ").trim() || "";
        const lines =
          card?.textContent
            ?.split("\n")
            .map((line) => line.trim())
            .filter(Boolean) || [];

        const name = anchor.getAttribute("aria-label") || lines[0] || "Unknown business";

        const ratingMatch = text.match(/\b([0-5]\.\d)\b/);
        const reviewMatch = text.match(/\((\d[\d,]*)\)/);

        const addressCandidate =
          lines.find((line) => /\d/.test(line) && !line.includes("minutes") && !line.includes("Open")) ||
          lines.find((line) => line.includes("St") || line.includes("Ave") || line.includes("Road")) ||
          "Address unavailable";

        rows.push({
          name,
          rating: ratingMatch ? Number(ratingMatch[1]) : null,
          reviewCount: reviewMatch ? toNumber(reviewMatch[1]) : null,
          address: addressCandidate,
        });

        if (rows.length >= limit) {
          break;
        }
      }

      return rows;
    }, maxResults);

    if (!scraped.length) {
      throw new Error(
        "No Google Maps results were captured. This can happen when Google blocks automated checks.",
      );
    }

    return scraped.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      rating: item.rating,
      reviewCount: item.reviewCount,
      address: item.address,
    }));
  } finally {
    await browser.close();
  }
}

export function summarizeCompetitorStrength(results: CompetitorResult[]) {
  const ranked = results.slice(0, 3);

  if (ranked.length === 0) {
    return "No competitors were detected in this search window.";
  }

  const avgRating =
    ranked
      .map((item) => item.rating)
      .filter((item): item is number => item !== null)
      .reduce((acc, item) => acc + item, 0) / Math.max(ranked.length, 1);

  const reviewTotal = ranked.reduce((acc, item) => acc + (item.reviewCount ?? 0), 0);

  return `Top competitors average ${avgRating.toFixed(2)} stars with ${reviewTotal.toLocaleString()} combined reviews.`;
}
