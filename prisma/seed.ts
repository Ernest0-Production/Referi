/**
 * Seed script for development/staging.
 * Run: npm run db:seed
 */

import "dotenv/config";

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo users
  const referrer = await prisma.user.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      displayName: "Алексей (Референт)",
      email: "alexey@example.test",
      contactInfo: "@alexey_ref",
      bio: "Backend-разработчик, 8+ лет опыта в распределенных системах.",
      githubProfile: {
        create: {
          githubId: 1000001,
          githubLogin: "alexey-referrer",
          githubCreatedAt: new Date("2020-01-15"),
          accessToken: "mock_encrypted_token",
          paidRegistration: false,
        },
      },
    },
  });

  const seeker = await prisma.user.upsert({
    where: { id: "00000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000002",
      displayName: "Мария (Соискатель)",
      email: "maria@example.test",
      contactInfo: "@maria_seek",
      bio: "Fullstack-инженер, работаю с React, Node.js и PostgreSQL.",
      githubProfile: {
        create: {
          githubId: 1000002,
          githubLogin: "maria-seeker",
          githubCreatedAt: new Date("2021-06-10"),
          accessToken: "mock_encrypted_token_2",
          paidRegistration: false,
        },
      },
    },
  });

  const moderator = await prisma.user.upsert({
    where: { id: "00000000-0000-4000-8000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000003",
      displayName: "Модератор",
      email: "moderator@example.test",
      staffRoles: ["MODERATOR", "ADMIN"],
      githubProfile: {
        create: {
          githubId: 1000003,
          githubLogin: "referi-moderator",
          githubCreatedAt: new Date("2019-03-20"),
          accessToken: "mock_encrypted_token_3",
          paidRegistration: false,
        },
      },
    },
  });

  // Create demo vacancies
  const vacancy1 = await prisma.vacancy.upsert({
    where: { id: "00000000-0000-4000-8000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000010",
      referrerId: referrer.id,
      title: "Senior Backend Developer",
      companyName: "TechCorp",
      specialty: "BACKEND",
      grade: "SENIOR",
      workFormat: "REMOTE",
      salaryCurrency: "RUB",
      salaryFromKopecks: BigInt(250_000_00),
      salaryToKopecks: BigInt(350_000_00),
      description:
        "Ищем опытного backend-разработчика в команду платёжных систем. " +
        "Стек: Go, PostgreSQL, Redis, Kafka. Работа полностью удалённая.",
      rewardKopecks: BigInt(50_000_00),
      status: "ACTIVE",
    },
  });

  const vacancy2 = await prisma.vacancy.upsert({
    where: { id: "00000000-0000-4000-8000-000000000011" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000011",
      referrerId: referrer.id,
      title: "Frontend Developer (React)",
      companyName: "StartupXYZ",
      specialty: "FRONTEND",
      grade: "MIDDLE",
      workFormat: "HYBRID",
      salaryCurrency: "RUB",
      salaryFromKopecks: BigInt(150_000_00),
      salaryToKopecks: BigInt(220_000_00),
      description:
        "Ищем React-разработчика в небольшую продуктовую команду. " +
        "TypeScript, Next.js, Tailwind CSS. Гибрид: 2 дня в офисе в Москве.",
      rewardKopecks: BigInt(0),
      status: "ACTIVE",
    },
  });

  console.log("✅ Created users:", referrer.id, seeker.id, moderator.id);
  console.log("✅ Created vacancies:", vacancy1.id, vacancy2.id);
  console.log("🎉 Seed completed!");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
