import { Queue, QueueEvents, Worker } from "bullmq";

import {
  buildWeeklySummary,
  getDashboardKeywords,
  listPaidCustomerEmails,
  saveWeeklyReport,
  storeRankingSnapshot,
} from "@/lib/database";
import { sendWeeklyReportEmail } from "@/lib/email";
import { scrapeGoogleMapsRankings, summarizeCompetitorStrength } from "@/lib/scraper";
import type { LocationInput, RankingCheckResult } from "@/lib/types";

type RankingCheckJobData = {
  ownerEmail: string;
  keyword: string;
  trackedBusiness: string;
  location: LocationInput;
};

type QueueResult =
  | {
      status: "completed";
      result: RankingCheckResult;
    }
  | {
      status: "queued";
      jobId: string;
    };

const RANKING_QUEUE_NAME = "local-seo-ranking-checks";
const WEEKLY_REPORT_QUEUE_NAME = "local-seo-weekly-reports";

let rankingQueue: Queue<RankingCheckJobData, RankingCheckResult> | null = null;
let weeklyQueue: Queue | null = null;
let rankingWorker: Worker<RankingCheckJobData, RankingCheckResult> | null = null;
let weeklyWorker: Worker | null = null;
let rankingEvents: QueueEvents | null = null;
let weeklyScheduled = false;

function hasRedis() {
  return Boolean(process.env.REDIS_URL);
}

function redisConnectionConfig() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  const parsed = new URL(process.env.REDIS_URL);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

async function runRankingJob(data: RankingCheckJobData): Promise<RankingCheckResult> {
  const competitors = await scrapeGoogleMapsRankings({
    keyword: data.keyword,
    location: data.location,
    maxResults: 10,
  });

  return storeRankingSnapshot({
    ownerEmail: data.ownerEmail,
    keyword: data.keyword,
    trackedBusiness: data.trackedBusiness,
    location: data.location,
    competitors,
  });
}

async function runWeeklyReportsJob() {
  const paidEmails = listPaidCustomerEmails();

  for (const email of paidEmails) {
    const summary = buildWeeklySummary(email);
    const dashboardKeywords = getDashboardKeywords(email);
    const topCompetitors = dashboardKeywords.flatMap((item) => item.competitors.slice(0, 3));
    const competitorContext = summarizeCompetitorStrength(topCompetitors);
    const reportText = `${summary}\n\nCompetitive pulse: ${competitorContext}`;

    saveWeeklyReport(email, reportText);
    await sendWeeklyReportEmail({ to: email, summary: reportText });
  }

  return {
    sentTo: paidEmails.length,
  };
}

async function ensureBull() {
  if (!hasRedis()) {
    return;
  }

  const connection = redisConnectionConfig();
  if (!connection) {
    return;
  }

  if (!rankingQueue) {
    rankingQueue = new Queue<RankingCheckJobData, RankingCheckResult>(RANKING_QUEUE_NAME, {
      connection,
    });
  }

  if (!weeklyQueue) {
    weeklyQueue = new Queue(WEEKLY_REPORT_QUEUE_NAME, {
      connection,
    });
  }

  if (!rankingEvents) {
    rankingEvents = new QueueEvents(RANKING_QUEUE_NAME, { connection });
  }

  if (!rankingWorker) {
    rankingWorker = new Worker<RankingCheckJobData, RankingCheckResult>(
      RANKING_QUEUE_NAME,
      async (job) => runRankingJob(job.data),
      {
        connection,
        concurrency: 2,
      },
    );
  }

  if (!weeklyWorker) {
    weeklyWorker = new Worker(
      WEEKLY_REPORT_QUEUE_NAME,
      async () => runWeeklyReportsJob(),
      {
        connection,
        concurrency: 1,
      },
    );
  }

  if (!weeklyScheduled && weeklyQueue) {
    await weeklyQueue.add(
      "weekly-summary",
      {},
      {
        jobId: "weekly-summary-schedule",
        repeat: {
          pattern: "0 9 * * MON",
        },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );

    weeklyScheduled = true;
  }
}

export async function ensureQueueInfrastructure() {
  await ensureBull();
}

export async function enqueueRankingCheck(jobData: RankingCheckJobData): Promise<QueueResult> {
  await ensureBull();

  if (!rankingQueue || !rankingEvents) {
    const result = await runRankingJob(jobData);

    return {
      status: "completed",
      result,
    };
  }

  const job = await rankingQueue.add("rank-check", jobData, {
    removeOnComplete: 25,
    removeOnFail: 100,
  });

  try {
    const result = await job.waitUntilFinished(rankingEvents, 120_000);

    return {
      status: "completed",
      result,
    };
  } catch {
    return {
      status: "queued",
      jobId: String(job.id ?? "queued"),
    };
  }
}

export async function triggerWeeklyReportsNow() {
  await ensureBull();

  if (!weeklyQueue) {
    return runWeeklyReportsJob();
  }

  await weeklyQueue.add(
    "weekly-summary-manual",
    {},
    {
      removeOnComplete: 10,
      removeOnFail: 20,
    },
  );

  return {
    queued: true,
  };
}
