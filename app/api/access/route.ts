import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createAccessToken,
  getAccessCookieName,
  getAccessCookieTtlSeconds,
} from "@/lib/access";
import { hasPaidCustomer } from "@/lib/database";

export const runtime = "nodejs";

const accessSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = accessSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Enter the same email used at checkout.",
      },
      { status: 400 },
    );
  }

  const email = parsed.data.email;

  if (!hasPaidCustomer(email)) {
    return NextResponse.json(
      {
        error:
          "No paid subscription was found for this email yet. Complete checkout first or wait for webhook confirmation.",
      },
      { status: 402 },
    );
  }

  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.set(getAccessCookieName(), createAccessToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAccessCookieTtlSeconds(),
  });

  return response;
}
