import { NextResponse } from "next/server";
import {
  applyEscrowPaymentHeld,
  applyRegistrationPaymentSucceeded,
} from "@/server/services/yookassaWebhookHandlers";
import { prisma } from "@/lib/prisma";

/**
 * Dev-only: simulates YooKassa success for MockPaymentProvider redirects.
 */
export async function POST(request: Request) {
  if (process.env.FEATURE_REAL_PAYMENTS === "true") {
    return NextResponse.json({ error: "Not available with real payments" }, { status: 403 });
  }

  let body: { paymentId?: string };
  try {
    body = (await request.json()) as { paymentId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const paymentId = body.paymentId?.trim();
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const escrow = await prisma.escrowTransaction.findFirst({
    where: { yookassaPaymentId: paymentId },
  });
  if (escrow) {
    await applyEscrowPaymentHeld(paymentId);
    return NextResponse.json({ ok: true, type: "escrow" as const });
  }

  const reg = await prisma.registrationPayment.findFirst({
    where: { yookassaPaymentId: paymentId },
  });
  if (reg) {
    await applyRegistrationPaymentSucceeded(paymentId);
    return NextResponse.json({ ok: true, type: "registration" as const });
  }

  return NextResponse.json({ error: "Unknown paymentId" }, { status: 404 });
}
