import { createHmac, timingSafeEqual } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { upsertPurchase } from "@/lib/database";

export const runtime = "nodejs";

function parseStripeSignature(header: string): { timestamp: string; signatures: string[] } {
  const parts = header.split(",");
  const signatures: string[] = [];
  let timestamp = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") {
      timestamp = value;
    }

    if (key === "v1") {
      signatures.push(value);
    }
  }

  return {
    timestamp,
    signatures
  };
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const parsed = parseStripeSignature(signatureHeader);
  if (!parsed.timestamp || parsed.signatures.length === 0) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${payload}`)
    .digest("hex");

  return parsed.signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  });
}

function statusFromEvent(eventType: string): "active" | "past_due" | "canceled" {
  if (eventType === "customer.subscription.deleted") {
    return "canceled";
  }

  if (eventType === "invoice.payment_failed") {
    return "past_due";
  }

  return "active";
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const stripeSignature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!stripeSignature || !verifyStripeSignature(rawBody, stripeSignature, webhookSecret)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const eventType = typeof payload.type === "string" ? payload.type : "";
  const dataObject =
    payload.data && typeof payload.data === "object"
      ? ((payload.data as { object?: Record<string, unknown> }).object ?? {})
      : {};

  const emailFromCustomerDetails =
    dataObject.customer_details && typeof dataObject.customer_details === "object"
      ? ((dataObject.customer_details as { email?: unknown }).email as string | undefined)
      : undefined;
  const customerEmail =
    (dataObject.customer_email as string | undefined) ?? emailFromCustomerDetails;

  if (customerEmail) {
    upsertPurchase(customerEmail, {
      customerId: (dataObject.customer as string | undefined) ?? null,
      checkoutSessionId: (dataObject.id as string | undefined) ?? null,
      eventId: (payload.id as string | undefined) ?? null,
      status: statusFromEvent(eventType)
    });
  }

  return NextResponse.json({ received: true });
}
