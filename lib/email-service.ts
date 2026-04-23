import nodemailer from "nodemailer";

import type { RankingCheckRecord } from "@/lib/types";

function hasSmtpConfig(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.REPORT_FROM_EMAIL
  );
}

function createTransport() {
  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function buildCompetitorTable(check: RankingCheckRecord): string {
  const lines = check.results.map((result) => {
    const topCompetitor = result.competitors.find((entry) => !entry.isTarget);

    return `${result.keyword} (${result.neighborhood})\n` +
      `  Your position: ${result.targetPosition ?? "Not in top results"}\n` +
      `  Top competitor: ${topCompetitor?.name ?? "No competitor data"} (${topCompetitor?.position ?? "-"})\n` +
      `  Visibility score: ${result.visibilityScore}`;
  });

  return lines.join("\n\n");
}

export async function sendWeeklyRankingEmail(input: {
  to: string;
  businessName: string;
  check: RankingCheckRecord;
}): Promise<{ delivered: boolean; reason?: string }> {
  if (!hasSmtpConfig()) {
    return {
      delivered: false,
      reason: "SMTP not configured"
    };
  }

  const transport = createTransport();
  const checkedDate = new Date(input.check.checkedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const subject = `${input.businessName} local SEO report - week ending ${checkedDate}`;

  const text = [
    `Weekly local ranking summary for ${input.businessName}`,
    `Checked on: ${checkedDate}`,
    "",
    buildCompetitorTable(input.check),
    "",
    "Recommendations:",
    "1. Strengthen location pages for neighborhoods where your position is worse than #5.",
    "2. Add recent customer photos and posts to your Google Business Profile.",
    "3. Encourage 3-5 new local reviews this week using neighborhood-specific service language."
  ].join("\n");

  await transport.sendMail({
    from: process.env.REPORT_FROM_EMAIL,
    to: input.to,
    subject,
    text
  });

  return {
    delivered: true
  };
}
