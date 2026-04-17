import { prisma } from "@/lib/prisma";
import { calculateCommission } from "@/shared/utils/money";
import { paymentProvider } from "@/server/services/paymentService";

interface YookassaWebhookEvent {
  type: string;
  event: string;
  object: {
    id: string;
    status: string;
    metadata?: Record<string, string>;
  };
}

function verifyYookassaSignature(
  _body: string,
  _authHeader: string | null,
): boolean {
  // TODO: implement HMAC-SHA256 verification in production
  // For now, verify via Basic auth shop_id:secret_key
  if (process.env.FEATURE_REAL_PAYMENTS !== "true") return true;

  const shopId = process.env.YOOKASSA_SHOP_ID ?? "";
  const secretKey = process.env.YOOKASSA_SECRET_KEY ?? "";
  const expected = `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
  return _authHeader === expected;
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
    const { type, object } = event;
    const paymentId = object.id;

    if (
      type === "notification" &&
      event.event === "payment.waiting_for_capture"
    ) {
      // Escrow hold succeeded
      await handlePaymentHeld(paymentId);
    } else if (type === "notification" && event.event === "payment.canceled") {
      // Payment canceled (deadline expired or user canceled)
      await handlePaymentCanceled(paymentId);
    } else if (type === "notification" && event.event === "payment.succeeded") {
      // Registration payment for young accounts
      await handleRegistrationPaymentSucceeded(paymentId);
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
}

async function handlePaymentHeld(yookassaPaymentId: string) {
  const escrow = await prisma.escrowTransaction.findFirst({
    where: { yookassaPaymentId },
  });
  if (!escrow || escrow.status !== "HELD") return;

  const application = await prisma.application.findUnique({
    where: { id: escrow.applicationId },
  });
  if (!application || application.status !== "AWAITING_PAYMENT") return;

  const { BUSINESS_RULES } = await import("@/shared/constants/businessRules");

  await prisma.$transaction(async (tx) => {
    await tx.escrowTransaction.update({
      where: { id: escrow.id },
      data: { heldAt: new Date() },
    });
    await tx.application.update({
      where: { id: escrow.applicationId },
      data: {
        status: "AWAITING_RESUME_HANDOFF",
        paymentDeadline: null,
        resumeHandoffDeadline: new Date(
          Date.now() + BUSINESS_RULES.SLA_RESUME_HANDOFF_MS,
        ),
      },
    });
    await tx.auditLog.create({
      data: {
        applicationId: escrow.applicationId,
        fromStatus: "AWAITING_PAYMENT",
        toStatus: "AWAITING_RESUME_HANDOFF",
        actor: "SYSTEM",
        metadata: { yookassaPaymentId },
      },
    });
  });
}

async function handlePaymentCanceled(yookassaPaymentId: string) {
  const escrow = await prisma.escrowTransaction.findFirst({
    where: { yookassaPaymentId },
  });
  if (!escrow) return;

  const application = await prisma.application.findUnique({
    where: { id: escrow.applicationId },
  });
  if (!application || application.status !== "AWAITING_PAYMENT") return;

  await prisma.$transaction(async (tx) => {
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

async function handleRegistrationPaymentSucceeded(yookassaPaymentId: string) {
  const regPayment = await prisma.registrationPayment.findFirst({
    where: { yookassaPaymentId },
  });
  if (!regPayment || regPayment.paidAt) return;

  await prisma.$transaction([
    prisma.registrationPayment.update({
      where: { id: regPayment.id },
      data: { paidAt: new Date() },
    }),
    prisma.gitHubProfile.update({
      where: { userId: regPayment.userId },
      data: { paidRegistration: true },
    }),
  ]);
}
