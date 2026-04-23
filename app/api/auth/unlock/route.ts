import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ACCESS_COOKIE_NAME } from "@/lib/access";
import { createAccessSession, hasActivePurchase } from "@/lib/database";

export const runtime = "nodejs";

const unlockSchema = z.object({
  email: z.string().email()
});

function withAccessCookie(response: NextResponse, sessionToken: string) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}

async function parseEmail(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = unlockSchema.safeParse(await request.json());
    return parsed.success ? parsed.data.email : null;
  }

  const formData = await request.formData();
  const parsed = unlockSchema.safeParse({
    email: formData.get("email")
  });

  return parsed.success ? parsed.data.email : null;
}

export async function POST(request: NextRequest) {
  const email = await parseEmail(request);
  if (!email) {
    return NextResponse.json(
      {
        error: "invalid_email"
      },
      { status: 400 }
    );
  }

  if (!hasActivePurchase(email)) {
    return NextResponse.json(
      {
        error: "purchase_not_found",
        message:
          "No completed Stripe purchase found for that email yet. Complete checkout or wait for webhook confirmation."
      },
      { status: 403 }
    );
  }

  const token = createAccessSession(email);
  const acceptsJson = (request.headers.get("accept") ?? "").includes("application/json");

  if (acceptsJson || (request.headers.get("content-type") ?? "").includes("application/json")) {
    const response = NextResponse.json({ success: true });
    return withAccessCookie(response, token);
  }

  const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
  return withAccessCookie(redirectResponse, token);
}
