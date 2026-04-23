import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { markCustomerPaid } from "@/lib/database";

export const runtime = "nodejs";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string;
      customer_email?: string;
      customer_details?: {
        email?: string;
      };
    };
  };
};

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifyStripeSignature(rawBody: string, signatureHeader: string, webhookSecret: string) {
  const fields = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, item) => {
    const [key, value] = item.split("=");
    if (!key || !value) {
      return acc;
    }

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(value);
    return acc;
  }, {});

  const timestamp = fields.t?.[0];
  const signatures = fields.v1 ?? [];

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");

  return signatures.some((candidate) => safeCompare(expected, candidate));
}

function readCheckoutEmail(event: StripeEvent) {
  return (
    event.data.object.customer_details?.email ??
    event.data.object.customer_email ??
    undefined
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signatureHeader = request.headers.get("stripe-signature");
    if (!signatureHeader) {
      return NextResponse.json(
        {
          error: "Missing stripe-signature header.",
        },
        { status: 400 },
      );
    }

    if (!verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
      return NextResponse.json(
        {
          error: "Stripe signature validation failed.",
        },
        { status: 400 },
      );
    }
  }

  const event = JSON.parse(rawBody) as StripeEvent;

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const email = readCheckoutEmail(event);

    if (email) {
      markCustomerPaid({
        email,
        stripeSessionId: event.data.object.id ?? null,
        stripeCustomerId: event.data.object.customer ?? null,
      });
    }
  }

  return NextResponse.json({
    received: true,
    eventId: event.id,
    eventType: event.type,
  });
}
