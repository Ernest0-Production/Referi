import type { Prisma, PrismaClient } from "@prisma/client";
import { createApplicationRepository } from "@/server/repositories/applicationRepository";
import { BusinessError } from "./submitApplication";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { cancelSLAJob, scheduleCancelAckSLA } from "@/server/workers/slaWorker";

export async function seekerRequestCancel(
  db: PrismaClient,
  applicationId: string,
  seekerId: string,
) {
  const appRepo = createApplicationRepository(db);
  const application = await appRepo.findByIdForUpdate(applicationId);

  if (!application) throw new BusinessError("APPLICATION_NOT_FOUND");
  if (application.seekerId !== seekerId) throw new BusinessError("FORBIDDEN");
  if (application.status !== "AWAITING_RESUME_HANDOFF")
    throw new BusinessError("APPLICATION_WRONG_STATUS");

  const cancelAckDeadline = new Date(Date.now() + BUSINESS_RULES.SLA_CANCEL_ACK_MS);

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "SEEKER_CANCEL_REQUESTED",
        cancelAckDeadline,
      },
    });
    await tx.auditLog.create({
      data: {
        applicationId,
        fromStatus: "AWAITING_RESUME_HANDOFF",
        toStatus: "SEEKER_CANCEL_REQUESTED",
        actor: "SEEKER",
        actorId: seekerId,
      },
    });
  });

  void cancelSLAJob(`resume-handoff-sla:${applicationId}`);
  void scheduleCancelAckSLA(applicationId);

  void (async () => {
    if (process.env.FEATURE_EMAIL !== "true") return;
    const rid = application.vacancy.referrerId;
    const referrer = await db.user.findUnique({
      where: { id: rid },
      select: { email: true, displayName: true },
    });
    if (!referrer?.email) return;
    const seeker = await db.user.findUnique({
      where: { id: seekerId },
      select: { displayName: true },
    });
    const deadline = cancelAckDeadline.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
    const { emailService, emailTemplates } = await import("@/server/services/emailService");
    const tpl = emailTemplates.seekerRequestedCancel({
      referrerName: referrer.displayName ?? "Здравствуйте",
      vacancyTitle: application.vacancy.title,
      seekerName: seeker?.displayName ?? seekerId,
      deadlineMoscow: deadline,
    });
    await emailService.send({
      to: referrer.email,
      subject: tpl.subject,
      html: tpl.html,
    });
  })();

  return { status: "SEEKER_CANCEL_REQUESTED" as const, cancelAckDeadline };
}
