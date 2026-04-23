import { createHash, randomBytes, randomUUID } from "crypto";
import { mkdirSync } from "fs";
import path from "path";

import Database from "better-sqlite3";

import type {
  BusinessRecord,
  KeywordRecord,
  RankingCheckRecord,
  RankingResultInput,
  RankingResultRecord,
  TrendPoint
} from "@/lib/types";

type PurchaseRow = {
  email: string;
};

type BusinessRow = {
  id: string;
  owner_email: string;
  name: string;
  gmb_name: string;
  website: string | null;
  primary_city: string;
  created_at: string;
  updated_at: string;
};

type KeywordRow = {
  id: string;
  business_id: string;
  keyword: string;
  neighborhood: string;
  created_at: string;
};

type RankingCheckRow = {
  id: string;
  business_id: string;
  checked_at: string;
  source: string;
};

type RankingResultRow = {
  id: string;
  check_id: string;
  keyword_id: string;
  keyword: string;
  neighborhood: string;
  target_position: number | null;
  visibility_score: number;
  competitors_json: string;
  created_at: string;
};

const databasePath =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "local-seo-rank-tracker.sqlite");

mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS purchases (
    email TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'active',
    customer_id TEXT,
    checkout_session_id TEXT,
    last_event_id TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS access_sessions (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    owner_email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    gmb_name TEXT NOT NULL,
    website TEXT,
    primary_city TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS keywords (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (business_id, keyword, neighborhood),
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ranking_checks (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    source TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ranking_results (
    id TEXT PRIMARY KEY,
    check_id TEXT NOT NULL,
    keyword_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    target_position INTEGER,
    visibility_score REAL NOT NULL,
    competitors_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (check_id) REFERENCES ranking_checks(id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_checks_business ON ranking_checks (business_id, checked_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON access_sessions (expires_at);
`);

function toBusinessRecord(row: BusinessRow): BusinessRecord {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    name: row.name,
    gmbName: row.gmb_name,
    website: row.website,
    primaryCity: row.primary_city,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toKeywordRecord(row: KeywordRow): KeywordRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    keyword: row.keyword,
    neighborhood: row.neighborhood,
    createdAt: row.created_at
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

export function upsertPurchase(
  email: string,
  options?: {
    customerId?: string | null;
    checkoutSessionId?: string | null;
    eventId?: string | null;
    status?: "active" | "past_due" | "canceled";
  }
) {
  const normalized = normalizeEmail(email);
  const updatedAt = nowIso();
  db.prepare(
    `
      INSERT INTO purchases (
        email,
        status,
        customer_id,
        checkout_session_id,
        last_event_id,
        updated_at
      ) VALUES (
        @email,
        @status,
        @customerId,
        @checkoutSessionId,
        @eventId,
        @updatedAt
      )
      ON CONFLICT(email) DO UPDATE SET
        status = excluded.status,
        customer_id = COALESCE(excluded.customer_id, purchases.customer_id),
        checkout_session_id = COALESCE(excluded.checkout_session_id, purchases.checkout_session_id),
        last_event_id = COALESCE(excluded.last_event_id, purchases.last_event_id),
        updated_at = excluded.updated_at
    `
  ).run({
    email: normalized,
    status: options?.status ?? "active",
    customerId: options?.customerId ?? null,
    checkoutSessionId: options?.checkoutSessionId ?? null,
    eventId: options?.eventId ?? null,
    updatedAt
  });
}

export function hasActivePurchase(email: string): boolean {
  const normalized = normalizeEmail(email);
  const row = db
    .prepare(
      `
        SELECT email
        FROM purchases
        WHERE email = ? AND status = 'active'
        LIMIT 1
      `
    )
    .get(normalized) as PurchaseRow | undefined;

  return Boolean(row);
}

export function createAccessSession(email: string, daysValid = 30): string {
  cleanupExpiredSessions();

  const normalized = normalizeEmail(email);
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const createdAt = nowIso();
  const expiresAtDate = new Date();
  expiresAtDate.setDate(expiresAtDate.getDate() + daysValid);

  db.prepare(
    `
      INSERT INTO access_sessions (token_hash, email, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `
  ).run(tokenHash, normalized, expiresAtDate.toISOString(), createdAt);

  return token;
}

export function getSessionEmailForToken(token: string): string | null {
  cleanupExpiredSessions();
  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `
        SELECT email
        FROM access_sessions
        WHERE token_hash = ?
        LIMIT 1
      `
    )
    .get(tokenHash) as PurchaseRow | undefined;

  return row?.email ?? null;
}

export function revokeSession(token: string) {
  const tokenHash = hashToken(token);
  db.prepare(`DELETE FROM access_sessions WHERE token_hash = ?`).run(tokenHash);
}

export function cleanupExpiredSessions() {
  db.prepare(`DELETE FROM access_sessions WHERE expires_at <= ?`).run(nowIso());
}

export function saveBusinessProfile(
  ownerEmail: string,
  payload: {
    name: string;
    gmbName: string;
    website?: string | null;
    primaryCity: string;
  }
): BusinessRecord {
  const normalizedOwner = normalizeEmail(ownerEmail);
  const now = nowIso();

  const existing = db
    .prepare(`SELECT * FROM businesses WHERE owner_email = ? LIMIT 1`)
    .get(normalizedOwner) as BusinessRow | undefined;

  if (existing) {
    db.prepare(
      `
        UPDATE businesses
        SET
          name = @name,
          gmb_name = @gmbName,
          website = @website,
          primary_city = @primaryCity,
          updated_at = @updatedAt
        WHERE owner_email = @ownerEmail
      `
    ).run({
      ownerEmail: normalizedOwner,
      name: payload.name,
      gmbName: payload.gmbName,
      website: payload.website ?? null,
      primaryCity: payload.primaryCity,
      updatedAt: now
    });

    const updated = db
      .prepare(`SELECT * FROM businesses WHERE owner_email = ? LIMIT 1`)
      .get(normalizedOwner) as BusinessRow;

    return toBusinessRecord(updated);
  }

  const businessId = randomUUID();
  db.prepare(
    `
      INSERT INTO businesses (
        id,
        owner_email,
        name,
        gmb_name,
        website,
        primary_city,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @ownerEmail,
        @name,
        @gmbName,
        @website,
        @primaryCity,
        @createdAt,
        @updatedAt
      )
    `
  ).run({
    id: businessId,
    ownerEmail: normalizedOwner,
    name: payload.name,
    gmbName: payload.gmbName,
    website: payload.website ?? null,
    primaryCity: payload.primaryCity,
    createdAt: now,
    updatedAt: now
  });

  const inserted = db
    .prepare(`SELECT * FROM businesses WHERE id = ? LIMIT 1`)
    .get(businessId) as BusinessRow;

  return toBusinessRecord(inserted);
}

export function getBusinessByOwnerEmail(ownerEmail: string): BusinessRecord | null {
  const row = db
    .prepare(`SELECT * FROM businesses WHERE owner_email = ? LIMIT 1`)
    .get(normalizeEmail(ownerEmail)) as BusinessRow | undefined;

  return row ? toBusinessRecord(row) : null;
}

export function getBusinessById(businessId: string): BusinessRecord | null {
  const row = db
    .prepare(`SELECT * FROM businesses WHERE id = ? LIMIT 1`)
    .get(businessId) as BusinessRow | undefined;

  return row ? toBusinessRecord(row) : null;
}

export function listBusinesses(): BusinessRecord[] {
  const rows = db
    .prepare(`SELECT * FROM businesses ORDER BY created_at ASC`)
    .all() as BusinessRow[];

  return rows.map(toBusinessRecord);
}

export function replaceKeywordsForBusiness(
  businessId: string,
  entries: Array<{ keyword: string; neighborhood: string }>
): KeywordRecord[] {
  const transaction = db.transaction(
    (input: Array<{ keyword: string; neighborhood: string }>) => {
      db.prepare(`DELETE FROM keywords WHERE business_id = ?`).run(businessId);

      const insertStatement = db.prepare(
        `
          INSERT INTO keywords (id, business_id, keyword, neighborhood, created_at)
          VALUES (?, ?, ?, ?, ?)
        `
      );

      const createdAt = nowIso();
      for (const entry of input) {
        insertStatement.run(
          randomUUID(),
          businessId,
          entry.keyword.trim(),
          entry.neighborhood.trim(),
          createdAt
        );
      }
    }
  );

  transaction(entries);
  return listKeywordsForBusiness(businessId);
}

export function listKeywordsForBusiness(businessId: string): KeywordRecord[] {
  const rows = db
    .prepare(
      `
        SELECT *
        FROM keywords
        WHERE business_id = ?
        ORDER BY keyword ASC, neighborhood ASC
      `
    )
    .all(businessId) as KeywordRow[];

  return rows.map(toKeywordRecord);
}

export function saveRankingCheck(input: {
  businessId: string;
  source: string;
  checkedAt?: string;
  rows: RankingResultInput[];
}): string {
  const checkId = randomUUID();
  const checkedAt = input.checkedAt ?? nowIso();

  const transaction = db.transaction(() => {
    db.prepare(
      `
        INSERT INTO ranking_checks (id, business_id, checked_at, source)
        VALUES (?, ?, ?, ?)
      `
    ).run(checkId, input.businessId, checkedAt, input.source);

    const insertResult = db.prepare(
      `
        INSERT INTO ranking_results (
          id,
          check_id,
          keyword_id,
          keyword,
          neighborhood,
          target_position,
          visibility_score,
          competitors_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

    const createdAt = nowIso();
    for (const row of input.rows) {
      insertResult.run(
        randomUUID(),
        checkId,
        row.keywordId,
        row.keyword,
        row.neighborhood,
        row.targetPosition,
        row.visibilityScore,
        JSON.stringify(row.competitors),
        createdAt
      );
    }
  });

  transaction();
  return checkId;
}

export function getRecentRankingChecks(
  businessId: string,
  limit = 20
): RankingCheckRecord[] {
  const checks = db
    .prepare(
      `
        SELECT *
        FROM ranking_checks
        WHERE business_id = ?
        ORDER BY checked_at DESC
        LIMIT ?
      `
    )
    .all(businessId, limit) as RankingCheckRow[];

  if (checks.length === 0) {
    return [];
  }

  const checkIds = checks.map((check) => check.id);
  const placeholders = checkIds.map(() => "?").join(",");
  const resultRows = db
    .prepare(
      `
        SELECT *
        FROM ranking_results
        WHERE check_id IN (${placeholders})
        ORDER BY created_at ASC
      `
    )
    .all(...checkIds) as RankingResultRow[];

  const grouped = new Map<string, RankingResultRecord[]>();
  for (const row of resultRows) {
    const resultRecord: RankingResultRecord = {
      id: row.id,
      checkId: row.check_id,
      keywordId: row.keyword_id,
      keyword: row.keyword,
      neighborhood: row.neighborhood,
      targetPosition: row.target_position,
      visibilityScore: row.visibility_score,
      competitors: JSON.parse(row.competitors_json),
      createdAt: row.created_at
    };

    const bucket = grouped.get(row.check_id);
    if (bucket) {
      bucket.push(resultRecord);
    } else {
      grouped.set(row.check_id, [resultRecord]);
    }
  }

  return checks.map((check) => ({
    id: check.id,
    businessId: check.business_id,
    checkedAt: check.checked_at,
    source: check.source,
    results: grouped.get(check.id) ?? []
  }));
}

export function getLatestRankingCheck(businessId: string): RankingCheckRecord | null {
  const checks = getRecentRankingChecks(businessId, 1);
  return checks[0] ?? null;
}

export function getTrendPoints(businessId: string, limit = 16): TrendPoint[] {
  const rows = db
    .prepare(
      `
        SELECT
          rc.checked_at AS checked_at,
          AVG(CASE WHEN rr.target_position IS NOT NULL THEN rr.target_position ELSE 21 END) AS avg_position,
          AVG(rr.visibility_score) AS avg_visibility
        FROM ranking_checks rc
        JOIN ranking_results rr ON rr.check_id = rc.id
        WHERE rc.business_id = ?
        GROUP BY rc.id, rc.checked_at
        ORDER BY rc.checked_at DESC
        LIMIT ?
      `
    )
    .all(businessId, limit) as Array<{
    checked_at: string;
    avg_position: number;
    avg_visibility: number;
  }>;

  return rows
    .reverse()
    .map((row) => ({
      checkedAt: row.checked_at,
      averagePosition: Number(row.avg_position.toFixed(2)),
      visibilityScore: Number(row.avg_visibility.toFixed(2))
    }));
}
