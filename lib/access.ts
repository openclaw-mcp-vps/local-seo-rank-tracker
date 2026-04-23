import { createHmac, timingSafeEqual } from "node:crypto";

const ACCESS_COOKIE_NAME = "lseo_access";
const ACCESS_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

function signingSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "dev-local-seo-rank-tracker-secret";
}

function sign(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("hex");
}

export function getAccessCookieName() {
  return ACCESS_COOKIE_NAME;
}

export function getAccessCookieTtlSeconds() {
  return ACCESS_COOKIE_TTL_SECONDS;
}

export function createAccessToken(email: string) {
  const payload = `${email.trim().toLowerCase()}|${Date.now()}`;
  const signature = sign(payload);

  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

export function readEmailFromAccessToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [email, issuedAt, signature] = decoded.split("|");

    if (!email || !issuedAt || !signature) {
      return null;
    }

    const payload = `${email}|${issuedAt}`;
    const expected = sign(payload);

    if (
      expected.length !== signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return null;
    }

    return email;
  } catch {
    return null;
  }
}
