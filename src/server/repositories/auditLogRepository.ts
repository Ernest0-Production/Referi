import type {
  PrismaClient,
  ApplicationStatus,
  AuditActor,
} from "@prisma/client";

interface AppendOptions {
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  actor: AuditActor;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export function createAuditLogRepository(db: PrismaClient) {
  async function append(opts: AppendOptions) {
    return db.auditLog.create({
      data: {
        applicationId: opts.applicationId,
        fromStatus: opts.fromStatus ?? undefined,
        toStatus: opts.toStatus,
        actor: opts.actor,
        actorId: opts.actorId,
        metadata: opts.metadata as Parameters<
          typeof db.auditLog.create
        >[0]["data"]["metadata"],
      },
    });
  }

  async function findByApplicationId(applicationId: string) {
    return db.auditLog.findMany({
      where: { applicationId },
      orderBy: { createdAt: "asc" },
    });
  }

  return { append, findByApplicationId };
}

export type AuditLogRepository = ReturnType<typeof createAuditLogRepository>;
