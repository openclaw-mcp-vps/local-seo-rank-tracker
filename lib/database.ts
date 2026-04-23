import fs from "node:fs";
import path from "node:path";

import BetterSqlite3 from "better-sqlite3";

import type {
  CompetitorResult,
  DashboardKeyword,
  LocationInput,
  RankingCheckResult,
  RankingHistoryPoint,
} from "@/lib/types";

type SqliteDatabase = BetterSqlite3.Database;

declare global {
  // eslint-disable-next-line no-var
  var __localSeoDb__: SqliteDatabase | undefined;
}

type TrackedKeywordRow = {
  id: number;
  keyword: string;
  tracked_business: string;
  location_name: string;
  lat: number;
  lng: number;
  radius_km: number;
  created_at: string;
};

type SnapshotRow = {
  checked_at: string;
  local_pack_rank: number | null;
  competitors_json: string;
};

function getDatabasePath() {
  const configured = process.env.DATABASE_PATH;
  if (configured) {
    return path.resolve(configured);
  }

  return path.join(process.cwd(), "data", "local-seo-rank-tracker.sqlite");
}

function initializeDatabase(db: SqliteDatabase) {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS customers (
      email TEXT PRIMARY KEY,
      stripe_session_id TEXT,
      stripe_customer_id TEXT,
      purchased_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracked_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_email TEXT NOT NULL,
      keyword TEXT NOT NULL,
      tracked_business TEXT NOT NULL DEFAULT '',
      location_name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_km REAL NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(owner_email, keyword, location_name)
    );

    CREATE TABLE IF NOT EXISTS ranking_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER NOT NULL,
      checked_at TEXT NOT NULL,
      local_pack_rank INTEGER,
      competitors_json TEXT NOT NULL,
      FOREIGN KEY(keyword_id) REFERENCES tracked_keywords(id)
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_email TEXT NOT NULL,
      week_start TEXT NOT NULL,
      summary TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tracked_keywords_owner
      ON tracked_keywords(owner_email);

    CREATE INDEX IF NOT EXISTS idx_snapshots_keyword
      ON ranking_snapshots(keyword_id, checked_at DESC);
  `);

  try {
    db.exec("ALTER TABLE tracked_keywords ADD COLUMN tracked_business TEXT NOT NULL DEFAULT '';");
  } catch {
    // Column already exists in mature databases.
  }
}

function openDatabase() {
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new BetterSqlite3(dbPath);
  initializeDatabase(db);

  return db;
}

function getDb() {
  if (!global.__localSeoDb__) {
    global.__localSeoDb__ = openDatabase();
  }

  return global.__localSeoDb__;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseCompetitors(raw: string): CompetitorResult[] {
  try {
    const parsed = JSON.parse(raw) as CompetitorResult[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore malformed values and return empty fallback
  }

  return [];
}

function findTrackedBusinessRank(
  competitors: CompetitorResult[],
  trackedBusiness: string,
) {
  const target = trackedBusiness.trim().toLowerCase();
  const match = competitors.find((item) => item.name.toLowerCase().includes(target));

  return match?.rank ?? null;
}

export function markCustomerPaid(params: {
  email: string;
  stripeSessionId?: string | null;
  stripeCustomerId?: string | null;
}) {
  const db = getDb();
  const email = normalizeEmail(params.email);

  db.prepare(
    `
      INSERT INTO customers (email, stripe_session_id, stripe_customer_id, purchased_at)
      VALUES (@email, @stripeSessionId, @stripeCustomerId, @purchasedAt)
      ON CONFLICT(email)
      DO UPDATE SET
        stripe_session_id = excluded.stripe_session_id,
        stripe_customer_id = excluded.stripe_customer_id,
        purchased_at = excluded.purchased_at
    `,
  ).run({
    email,
    stripeSessionId: params.stripeSessionId ?? null,
    stripeCustomerId: params.stripeCustomerId ?? null,
    purchasedAt: new Date().toISOString(),
  });

  return email;
}

export function hasPaidCustomer(email: string) {
  const db = getDb();
  const normalized = normalizeEmail(email);

  const row = db
    .prepare("SELECT email FROM customers WHERE email = ? LIMIT 1")
    .get(normalized) as { email?: string } | undefined;

  return Boolean(row?.email);
}

function upsertKeyword(
  ownerEmail: string,
  keyword: string,
  trackedBusiness: string,
  location: LocationInput,
) {
  const db = getDb();

  db.prepare(
    `
      INSERT INTO tracked_keywords (
        owner_email,
        keyword,
        tracked_business,
        location_name,
        lat,
        lng,
        radius_km,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_email, keyword, location_name)
      DO UPDATE SET
        tracked_business = excluded.tracked_business,
        lat = excluded.lat,
        lng = excluded.lng,
        radius_km = excluded.radius_km
    `,
  ).run(
    normalizeEmail(ownerEmail),
    keyword,
    trackedBusiness,
    location.name,
    location.lat,
    location.lng,
    location.radiusKm,
    new Date().toISOString(),
  );

  const row = db
    .prepare(
      `
        SELECT id
        FROM tracked_keywords
        WHERE owner_email = ? AND keyword = ? AND location_name = ?
        LIMIT 1
      `,
    )
    .get(normalizeEmail(ownerEmail), keyword, location.name) as { id: number } | undefined;

  if (!row) {
    throw new Error("Unable to create keyword tracking row.");
  }

  return row.id;
}

export function storeRankingSnapshot(params: {
  ownerEmail: string;
  keyword: string;
  trackedBusiness: string;
  location: LocationInput;
  competitors: CompetitorResult[];
}) {
  const db = getDb();
  const keywordId = upsertKeyword(
    params.ownerEmail,
    params.keyword,
    params.trackedBusiness,
    params.location,
  );
  const localPackRank = findTrackedBusinessRank(params.competitors, params.trackedBusiness);
  const checkedAt = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO ranking_snapshots (keyword_id, checked_at, local_pack_rank, competitors_json)
      VALUES (?, ?, ?, ?)
    `,
  ).run(keywordId, checkedAt, localPackRank, JSON.stringify(params.competitors));

  const result: RankingCheckResult = {
    keywordId,
    keyword: params.keyword,
    trackedBusiness: params.trackedBusiness,
    location: params.location,
    checkedAt,
    localPackRank,
    competitors: params.competitors,
  };

  return result;
}

export function getDashboardKeywords(ownerEmail: string): DashboardKeyword[] {
  const db = getDb();

  const keywords = db
    .prepare(
      `
        SELECT id, keyword, tracked_business, location_name, lat, lng, radius_km, created_at
        FROM tracked_keywords
        WHERE owner_email = ?
        ORDER BY created_at DESC
      `,
    )
    .all(normalizeEmail(ownerEmail)) as TrackedKeywordRow[];

  return keywords.map((keywordRow) => {
    const snapshots = db
      .prepare(
        `
          SELECT checked_at, local_pack_rank, competitors_json
          FROM ranking_snapshots
          WHERE keyword_id = ?
          ORDER BY checked_at DESC
          LIMIT 12
        `,
      )
      .all(keywordRow.id) as SnapshotRow[];

    const latest = snapshots[0];
    const previous = snapshots[1];

    const history: RankingHistoryPoint[] = snapshots
      .map((item) => ({
        checkedAt: item.checked_at,
        rank: item.local_pack_rank,
      }))
      .reverse();

    return {
      keywordId: keywordRow.id,
      keyword: keywordRow.keyword,
      trackedBusiness: keywordRow.tracked_business,
      location: {
        name: keywordRow.location_name,
        lat: keywordRow.lat,
        lng: keywordRow.lng,
        radiusKm: keywordRow.radius_km,
      },
      latestRank: latest?.local_pack_rank ?? null,
      previousRank: previous?.local_pack_rank ?? null,
      checkedAt: latest?.checked_at ?? null,
      competitors: latest ? parseCompetitors(latest.competitors_json) : [],
      history,
    };
  });
}

export function listPaidCustomerEmails() {
  const db = getDb();
  const rows = db.prepare("SELECT email FROM customers ORDER BY purchased_at ASC").all() as {
    email: string;
  }[];

  return rows.map((row) => row.email);
}

export function buildWeeklySummary(ownerEmail: string) {
  const db = getDb();
  const normalized = normalizeEmail(ownerEmail);

  const rows = db
    .prepare(
      `
        SELECT tk.keyword, tk.location_name, rs.local_pack_rank, rs.checked_at
        FROM ranking_snapshots rs
        INNER JOIN tracked_keywords tk ON tk.id = rs.keyword_id
        WHERE tk.owner_email = ?
          AND rs.checked_at >= datetime('now', '-7 day')
        ORDER BY tk.keyword ASC, rs.checked_at DESC
      `,
    )
    .all(normalized) as {
    keyword: string;
    location_name: string;
    local_pack_rank: number | null;
    checked_at: string;
  }[];

  if (rows.length === 0) {
    return "No ranking checks ran this week. Add keyword checks to start receiving competitor analysis.";
  }

  const byKeyword = new Map<string, { location: string; rank: number | null; checkedAt: string }>();

  for (const row of rows) {
    const key = `${row.keyword}::${row.location_name}`;
    if (!byKeyword.has(key)) {
      byKeyword.set(key, {
        location: row.location_name,
        rank: row.local_pack_rank,
        checkedAt: row.checked_at,
      });
    }
  }

  return Array.from(byKeyword.entries())
    .slice(0, 8)
    .map(([key, value]) => {
      const [keyword] = key.split("::");
      const rankLabel = value.rank ? `#${value.rank}` : "not in top results";

      return `${keyword} in ${value.location}: ${rankLabel} (checked ${new Date(value.checkedAt).toLocaleDateString()})`;
    })
    .join("\n");
}

export function saveWeeklyReport(ownerEmail: string, summary: string) {
  const db = getDb();

  db.prepare(
    `
      INSERT INTO weekly_reports (owner_email, week_start, summary, sent_at)
      VALUES (?, ?, ?, ?)
    `,
  ).run(
    normalizeEmail(ownerEmail),
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    summary,
    new Date().toISOString(),
  );
}
