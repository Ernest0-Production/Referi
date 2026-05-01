import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applyEscrowPaymentSucceeded,
  applyRegistrationPaymentSucceeded,
  applySubscriptionPaymentSucceeded,
  applySubscriptionRenewalSucceeded,
  applySubscriptionRenewalCanceled,
  applyPaidTokenPaymentSucceeded,
} from "@/server/services/yookassaWebhookHandlers";

interface YookassaWebhookObject {
  id: string;
  status?: string;
  metadata?: Record<string, string>;
  payment_method?: { id?: string };
}

interface YookassaWebhookEvent {
  type: string;
  event: string;
  object: YookassaWebhookObject;
}

/**
 * YooKassa уведомления: проверка по Basic Auth (shopId:secretKey) — штатный способ
 * в HTTP-уведомлениях. IP-фильтрация в кабинете YooKassa — дополнительный слой.
 */
function verifyYookassaSignature(_body: string, authHeader: string | null): boolean {
  if (process.env.FEATURE_REAL_PAYMENTS !== "true") return true;

  const shopId = process.env.YOOKASSA_SHOP_ID ?? "";
  const secretKey = process.env.YOOKASSA_SECRET_KEY ?? "";
  if (!shopId || !secretKey) return false;
  const expected = `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
  return authHeader === expected;
}

export async function POST(request: Request) {
  const body = await request.text();
  const authHeader = request.headers.get("Authorization");

  if (!verifyYookassaSignature(body, authHeader)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: YookassaWebhookEvent;
  try {
    event = JSON.parse(body) as YookassaWebhookEvent;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Process asynchronously — respond immediately
  void processWebhookEvent(event);

  return new Response("OK", { status: 200 });
}

async function processWebhookEvent(event: YookassaWebhookEvent) {
  try {
    const { type, event: eventName, object } = event;
    if (type !== "notification") return;

    const paymentId = object.id;
    const metaType = object.metadata?.type;

    if (eventName === "payment.succeeded") {
      if (metaType === "escrow") {
        await applyEscrowPaymentSucceeded(paymentId);
        return;
      }
      if (metaType === "registration") {
        await applyRegistrationPaymentSucceeded(paymentId);
        return;
      }
      if (metaType === "subscription") {
        const userId = object.metadata?.userId;
        if (userId) {
          await applySubscriptionPaymentSucceeded(
            userId,
            object.payment_method?.id ?? null,
            paymentId,
          );
        }
        return;
      }
      if (metaType === "subscription_renewal") {
        const userId = object.metadata?.userId;
        if (userId) {
          await applySubscriptionRenewalSucceeded(
            userId,
            paymentId,
            object.payment_method?.id ?? null,
          );
        }
        return;
      }
      if (metaType === "paid_token") {
        await applyPaidTokenPaymentSucceeded(paymentId);
        return;
      }

      const escrow = await prisma.escrowTransaction.findFirst({
        where: { yookassaPaymentId: paymentId },
      });
      if (escrow) {
        await applyEscrowPaymentSucceeded(paymentId);
        return;
      }

      const reg = await prisma.registrationPayment.findFirst({
        where: { yookassaPaymentId: paymentId },
      });
      if (reg) {
        await applyRegistrationPaymentSucceeded(paymentId);
        return;
      }

      await applyPaidTokenPaymentSucceeded(paymentId);
      return;
    }

    if (eventName === "payment.waiting_for_capture" && metaType === "escrow") {
      await applyEscrowPaymentSucceeded(paymentId);
      return;
    }

    if (eventName === "payment.canceled") {
      if (metaType === "subscription_renewal") {
        const userId = object.metadata?.userId;
        if (userId) {
          await applySubscriptionRenewalCanceled(userId);
        }
        return;
      }
      if (metaType === "escrow" || !metaType) {
        await handleEscrowPaymentCanceled(paymentId);
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
}

async function handleEscrowPaymentCanceled(yookassaPaymentId: string) {
  const escrow = await prisma.escrowTransaction.findFirst({
    where: { yookassaPaymentId },
  });
  if (!escrow) return;

  const application = await prisma.application.findUnique({
    where: { id: escrow.applicationId },
  });
  if (!application || application.status !== "AWAITING_PAYMENT") return;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.application.update({
      where: { id: escrow.applicationId },
      data: { status: "CANCELLED", paymentDeadline: null },
    });
    await tx.auditLog.create({
      data: {
        applicationId: escrow.applicationId,
        fromStatus: "AWAITING_PAYMENT",
        toStatus: "CANCELLED",
        actor: "SYSTEM",
        metadata: { reason: "payment_canceled", yookassaPaymentId },
      },
    });
  });
}
