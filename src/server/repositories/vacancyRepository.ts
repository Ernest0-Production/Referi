import type { PrismaClient, VacancyStatus } from "@prisma/client";

export function createVacancyRepository(db: PrismaClient) {
  async function findActiveByReferrer(referrerId: string) {
    return db.vacancy.findFirst({
      where: {
        referrerId,
        status: { in: ["ACTIVE", "FROZEN"] },
      },
    });
  }

  async function findById(id: string) {
    return db.vacancy.findUnique({ where: { id } });
  }

  async function updateStatus(id: string, status: VacancyStatus) {
    return db.vacancy.update({ where: { id }, data: { status } });
  }

  return { findActiveByReferrer, findById, updateStatus };
}

export type VacancyRepository = ReturnType<typeof createVacancyRepository>;
