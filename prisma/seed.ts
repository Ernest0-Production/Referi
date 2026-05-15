/**
 * Seed script for development/staging.
 * Run: npm run db:seed
 */

import "dotenv/config";

import type { Grade, Specialty, VacancyStatus, WorkFormat } from "@prisma/client";

import { prisma } from "../src/lib/prisma";

/** Детерминированный UUID: версия 4, вариант RFC 4122 (`10` после `8`). */
function uuidFromInt(n: number): string {
  const suffix = n.toString(16).padStart(12, "0").slice(-12);
  return `00000000-0000-4000-8000-${suffix}`;
}

const REFERRER_ID = uuidFromInt(0x01);
const DEMO_SEEKER_ID = uuidFromInt(0x02);
const MODERATOR_ID = uuidFromInt(0x03);
const ERNEST_ADMIN_ID = uuidFromInt(0x04);

/** 25 фейковых соискателей — хватает на максимум откликов на одну вакансию без нарушения @@unique([seekerId, vacancyId]). */
const FAKE_SEEKER_COUNT = 25;
const fakeSeekerIds = Array.from({ length: FAKE_SEEKER_COUNT }, (_, i) => uuidFromInt(0x200 + i));

type VacancySeedRow = {
  intId: number;
  title: string;
  companyName: string;
  specialty: Specialty;
  grade: Grade;
  workFormat: WorkFormat;
  salaryCurrency: "RUB" | "USD" | "EUR";
  salaryFromKopecks: bigint;
  salaryToKopecks: bigint;
  description: string;
  rewardKopecks: bigint;
  status: VacancyStatus;
  /** Сколько откликов создать (0 допустимо). */
  applicationCount: number;
};

/** 30 вакансий: разные стеки, зарплаты, награды; часть без откликов. */
const VACANCY_ROWS: VacancySeedRow[] = [
  {
    intId: 0x10,
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
    applicationCount: 4,
  },
  {
    intId: 0x11,
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
    applicationCount: 0,
  },
  {
    intId: 0x12,
    title: "DevOps Engineer",
    companyName: "CloudScale",
    specialty: "DEVOPS",
    grade: "MIDDLE",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(180_000_00),
    salaryToKopecks: BigInt(260_000_00),
    description:
      "Kubernetes, Terraform, GitLab CI. Онколл по ротации, прозрачные процессы и документация.",
    rewardKopecks: BigInt(30_000_00),
    status: "ACTIVE",
    applicationCount: 7,
  },
  {
    intId: 0x13,
    title: "QA Automation",
    companyName: "FinApp",
    specialty: "QA",
    grade: "MIDDLE",
    workFormat: "OFFICE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(140_000_00),
    salaryToKopecks: BigInt(190_000_00),
    description:
      "Playwright, API-тесты, интеграция в пайплайн. Офис в Санкт-Петербурге, белая зарплата.",
    rewardKopecks: BigInt(15_000_00),
    status: "ACTIVE",
    applicationCount: 0,
  },
  {
    intId: 0x14,
    title: "Fullstack (Node + React)",
    companyName: "MarketHub",
    specialty: "FULLSTACK",
    grade: "SENIOR",
    workFormat: "HYBRID",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(220_000_00),
    salaryToKopecks: BigInt(320_000_00),
    description:
      "B2B-маркетплейс: tRPC, Prisma, React 19. Нужен сильный продуктовый фокус и код-ревью.",
    rewardKopecks: BigInt(40_000_00),
    status: "ACTIVE",
    applicationCount: 2,
  },
  {
    intId: 0x15,
    title: "iOS Engineer",
    companyName: "MobilityOne",
    specialty: "IOS_MOBILE",
    grade: "MIDDLE",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(200_000_00),
    salaryToKopecks: BigInt(280_000_00),
    description: "SwiftUI, Combine, модульная архитектура. Удалёнка из РФ, синки в CET.",
    rewardKopecks: BigInt(35_000_00),
    status: "ACTIVE",
    applicationCount: 9,
  },
  {
    intId: 0x16,
    title: "Android (Kotlin)",
    companyName: "StreamLine",
    specialty: "ANDROID_MOBILE",
    grade: "SENIOR",
    workFormat: "REMOTE",
    salaryCurrency: "USD",
    salaryFromKopecks: BigInt(4_500_00),
    salaryToKopecks: BigInt(6_200_00),
    description:
      "Видеостриминг: ExoPlayer, Coroutines, чистая архитектура. Контракт в валюте, выплаты стабильные.",
    rewardKopecks: BigInt(75_000_00),
    status: "ACTIVE",
    applicationCount: 1,
  },
  {
    intId: 0x17,
    title: "Data Engineer",
    companyName: "InsightLab",
    specialty: "DATA",
    grade: "MIDDLE",
    workFormat: "HYBRID",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(170_000_00),
    salaryToKopecks: BigInt(240_000_00),
    description:
      "Airflow, dbt, ClickHouse. Строим витрины для аналитики продукта; команда data science рядом.",
    rewardKopecks: BigInt(0),
    status: "ACTIVE",
    applicationCount: 0,
  },
  {
    intId: 0x18,
    title: "ML Engineer",
    companyName: "NeuroCart",
    specialty: "ML_AI",
    grade: "SENIOR",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(300_000_00),
    salaryToKopecks: BigInt(420_000_00),
    description:
      "Рекомендательные системы, PyTorch, онлайн-инференс. Нужен опыт продакшн-мониторинга моделей.",
    rewardKopecks: BigInt(60_000_00),
    status: "ACTIVE",
    applicationCount: 5,
  },
  {
    intId: 0x19,
    title: "Security Engineer",
    companyName: "SafeBank",
    specialty: "SECURITY",
    grade: "LEAD",
    workFormat: "OFFICE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(280_000_00),
    salaryToKopecks: BigInt(380_000_00),
    description:
      "AppSec, threat modeling, SOC взаимодействие. Москва, допуск к чувствительной инфраструктуре.",
    rewardKopecks: BigInt(45_000_00),
    status: "ACTIVE",
    applicationCount: 3,
  },
  {
    intId: 0x1a,
    title: "Junior Frontend",
    companyName: "EduSoft",
    specialty: "FRONTEND",
    grade: "JUNIOR",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(80_000_00),
    salaryToKopecks: BigInt(110_000_00),
    description:
      "Менторство, дизайн-система на shadcn. Первый коммерческий опыт — ок, важнее мотивация и база.",
    rewardKopecks: BigInt(5_000_00),
    status: "ACTIVE",
    applicationCount: 12,
  },
  {
    intId: 0x1b,
    title: "Backend (Java / Spring)",
    companyName: "EnterpriseSoft",
    specialty: "BACKEND",
    grade: "MIDDLE",
    workFormat: "HYBRID",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(160_000_00),
    salaryToKopecks: BigInt(210_000_00),
    description:
      "Микросервисы, Kafka, PostgreSQL. Казань, гибрид 3/2; легаси аккуратно выносим в сервисы.",
    rewardKopecks: BigInt(20_000_00),
    status: "FROZEN",
    applicationCount: 0,
  },
  {
    intId: 0x1c,
    title: "Lead Fullstack",
    companyName: "GrowthRocket",
    specialty: "FULLSTACK",
    grade: "LEAD",
    workFormat: "REMOTE",
    salaryCurrency: "EUR",
    salaryFromKopecks: BigInt(5_500_00),
    salaryToKopecks: BigInt(7_800_00),
    description:
      "Маленькая команда, быстрые эксперименты. Next.js, NestJS, очереди. Нужен человек с вкусом к DX.",
    rewardKopecks: BigInt(90_000_00),
    status: "ACTIVE",
    applicationCount: 6,
  },
  {
    intId: 0x1d,
    title: "QA Manual + авто",
    companyName: "HealthTrack",
    specialty: "QA",
    grade: "JUNIOR",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(90_000_00),
    salaryToKopecks: BigInt(120_000_00),
    description:
      "Медтех: регрессия, чек-листы, постепенный переход на автотесты. Полная удалёнка по РФ.",
    rewardKopecks: BigInt(0),
    status: "ACTIVE",
    applicationCount: 8,
  },
  {
    intId: 0x1e,
    title: "DevOps (SRE)",
    companyName: "VideoCast",
    specialty: "DEVOPS",
    grade: "SENIOR",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(240_000_00),
    salaryToKopecks: BigInt(330_000_00),
    description: "SLI/SLO, инцидент-менеджмент, capacity planning. Высокая нагрузка на CDN и edge.",
    rewardKopecks: BigInt(55_000_00),
    status: "ACTIVE",
    applicationCount: 0,
  },
  {
    intId: 0x1f,
    title: "Python Backend",
    companyName: "LogisticsPro",
    specialty: "BACKEND",
    grade: "MIDDLE",
    workFormat: "OFFICE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(155_000_00),
    salaryToKopecks: BigInt(195_000_00),
    description:
      "Django/FastAPI, геосервисы, интеграции с перевозчиками. Новосибирск, офис у метро.",
    rewardKopecks: BigInt(12_000_00),
    status: "ACTIVE",
    applicationCount: 4,
  },
  {
    intId: 0x20,
    title: "React Native",
    companyName: "FitBuddy",
    specialty: "ANDROID_MOBILE",
    grade: "MIDDLE",
    workFormat: "HYBRID",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(175_000_00),
    salaryToKopecks: BigInt(230_000_00),
    description: "Кроссплатформа для фитнес-трекера. RN 0.76+, нативные модули по необходимости.",
    rewardKopecks: BigInt(25_000_00),
    status: "ACTIVE",
    applicationCount: 2,
  },
  {
    intId: 0x21,
    title: "Аналитик данных (SQL)",
    companyName: "RetailMetrics",
    specialty: "DATA",
    grade: "JUNIOR",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(95_000_00),
    salaryToKopecks: BigInt(130_000_00),
    description:
      "SQL, Metabase, ad-hoc отчёты для категорийных менеджеров. Без опыта в проде — возьмём с курсов.",
    rewardKopecks: BigInt(0),
    status: "ACTIVE",
    applicationCount: 0,
  },
  {
    intId: 0x22,
    title: "Platform Engineer",
    companyName: "InfraGrid",
    specialty: "DEVOPS",
    grade: "SENIOR",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(260_000_00),
    salaryToKopecks: BigInt(340_000_00),
    description:
      "Внутренняя платформа разработки: IDP, шаблоны сервисов, политики безопасности в CI.",
    rewardKopecks: BigInt(48_000_00),
    status: "ACTIVE",
    applicationCount: 10,
  },
  {
    intId: 0x23,
    title: "Penetration tester",
    companyName: "RedTeamRU",
    specialty: "SECURITY",
    grade: "MIDDLE",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(190_000_00),
    salaryToKopecks: BigInt(270_000_00),
    description:
      "Пентесты веб и мобайл, отчёты для заказчиков из финтеха. Проектная занятость возможна.",
    rewardKopecks: BigInt(70_000_00),
    status: "ACTIVE",
    applicationCount: 1,
  },
  {
    intId: 0x24,
    title: "SwiftUI macOS",
    companyName: "DeskTools",
    specialty: "IOS_MOBILE",
    grade: "MIDDLE",
    workFormat: "REMOTE",
    salaryCurrency: "USD",
    salaryFromKopecks: BigInt(3_800_00),
    salaryToKopecks: BigInt(5_100_00),
    description: "Утилиты для дизайнеров: песочница UI, плагины Figma bridge.",
    rewardKopecks: BigInt(40_000_00),
    status: "CLOSED",
    applicationCount: 0,
  },
  {
    intId: 0x25,
    title: "Golang microservices",
    companyName: "PayBridge",
    specialty: "BACKEND",
    grade: "SENIOR",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(270_000_00),
    salaryToKopecks: BigInt(360_000_00),
    description:
      "Низкая латентность, идемпотентность, outbox. Команда платежей; строгие ревью и метрики.",
    rewardKopecks: BigInt(52_000_00),
    status: "ACTIVE",
    applicationCount: 11,
  },
  {
    intId: 0x26,
    title: "Frontend (Vue)",
    companyName: "AgroDigital",
    specialty: "FRONTEND",
    grade: "MIDDLE",
    workFormat: "HYBRID",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(135_000_00),
    salaryToKopecks: BigInt(185_000_00),
    description:
      "Кабинеты агрохолдинга: Vue 3, Pinia, крупные таблицы и карты. Екатеринбург, гибрид.",
    rewardKopecks: BigInt(18_000_00),
    status: "ACTIVE",
    applicationCount: 0,
  },
  {
    intId: 0x27,
    title: "MLOps",
    companyName: "VisionLab",
    specialty: "ML_AI",
    grade: "MIDDLE",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(210_000_00),
    salaryToKopecks: BigInt(290_000_00),
    description:
      "Kubeflow, MLflow, CI для моделей. Computer vision в проде — обязательный бэкграунд.",
    rewardKopecks: BigInt(33_000_00),
    status: "ACTIVE",
    applicationCount: 5,
  },
  {
    intId: 0x28,
    title: "Engineering Manager",
    companyName: "TeamCraft",
    specialty: "BACKEND",
    grade: "LEAD",
    workFormat: "HYBRID",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(320_000_00),
    salaryToKopecks: BigInt(420_000_00),
    description:
      "Люди + техника: 2 команды backend, найм, 1:1, планирование кварталов. Москва, гибрид.",
    rewardKopecks: BigInt(80_000_00),
    status: "ACTIVE",
    applicationCount: 4,
  },
  {
    intId: 0x29,
    title: "Rust / systems",
    companyName: "EdgeNet",
    specialty: "BACKEND",
    grade: "SENIOR",
    workFormat: "REMOTE",
    salaryCurrency: "EUR",
    salaryFromKopecks: BigInt(6_000_00),
    salaryToKopecks: BigInt(8_500_00),
    description: "Сетевой стек, zero-copy, eBPF. Удалёнка; синки в вечернее мск-время.",
    rewardKopecks: BigInt(95_000_00),
    status: "ACTIVE",
    applicationCount: 2,
  },
  {
    intId: 0x2a,
    title: "Автотесты API",
    companyName: "InsureTech",
    specialty: "QA",
    grade: "MIDDLE",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(150_000_00),
    salaryToKopecks: BigInt(200_000_00),
    description: "Контрактные тесты, Pact, моки внешних страховых API. Удалёнка, таймзона РФ.",
    rewardKopecks: BigInt(22_000_00),
    status: "ACTIVE",
    applicationCount: 0,
  },
  {
    intId: 0x2b,
    title: "Android TV",
    companyName: "CinemaHome",
    specialty: "ANDROID_MOBILE",
    grade: "SENIOR",
    workFormat: "HYBRID",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(195_000_00),
    salaryToKopecks: BigInt(265_000_00),
    description: "Leanback, D-pad навигация, DRM. Офис в Москве 1–2 раза в неделю по желанию.",
    rewardKopecks: BigInt(28_000_00),
    status: "ACTIVE",
    applicationCount: 6,
  },
  {
    intId: 0x2c,
    title: "Data Scientist",
    companyName: "AdSmart",
    specialty: "ML_AI",
    grade: "MIDDLE",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(185_000_00),
    salaryToKopecks: BigInt(250_000_00),
    description:
      " uplift-модели, causal inference lite, A/B. Рекламная сеть, большие объёмы логов.",
    rewardKopecks: BigInt(0),
    status: "ACTIVE",
    applicationCount: 3,
  },
  {
    intId: 0x2d,
    title: "Fullstack (PHP → Node)",
    companyName: "LegacyLift",
    specialty: "FULLSTACK",
    grade: "SENIOR",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFromKopecks: BigInt(200_000_00),
    salaryToKopecks: BigInt(280_000_00),
    description: "Поэтапный вынос монолита на Node. Нужен спокойный подход к легаси и тестам.",
    rewardKopecks: BigInt(36_000_00),
    status: "ACTIVE",
    applicationCount: 7,
  },
];

function pickSeekersForVacancy(vacancyIndex: number, count: number, pool: string[]): string[] {
  if (count > pool.length) {
    throw new Error(`applicationCount ${count} превышает размер пула соискателей ${pool.length}`);
  }
  const offset = (vacancyIndex * 3) % pool.length;
  return Array.from({ length: count }, (_, j) => pool[(offset + j) % pool.length]!);
}

const ERNEST_GITHUB_LOGIN = "Ernest0-Production";

async function fetchGitHubUserForSeed(login: string): Promise<{
  id: number;
  created_at?: string;
} | null> {
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Referi-db-seed",
      },
    });
    if (!res.ok) {
      console.warn(
        `GitHub API ответил ${res.status} для ${login} — пользователь-админ в сид не добавлен.`,
      );
      return null;
    }
    const body = (await res.json()) as { id?: unknown; created_at?: string };
    const id = typeof body.id === "number" && Number.isFinite(body.id) ? body.id : NaN;
    if (!Number.isFinite(id)) {
      console.warn(
        `В ответе GitHub нет числового id для ${login} — пользователь-админ в сид не добавлен.`,
      );
      return null;
    }
    return { id, created_at: body.created_at };
  } catch (err) {
    console.warn("Не удалось запросить api.github.com для сида админа:", err);
    return null;
  }
}

async function main() {
  console.log("🌱 Seeding database...");

  const referrer = await prisma.user.upsert({
    where: { id: REFERRER_ID },
    update: {},
    create: {
      id: REFERRER_ID,
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
    where: { id: DEMO_SEEKER_ID },
    update: {},
    create: {
      id: DEMO_SEEKER_ID,
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
    where: { id: MODERATOR_ID },
    update: {},
    create: {
      id: MODERATOR_ID,
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

  const ghErnest = await fetchGitHubUserForSeed(ERNEST_GITHUB_LOGIN);
  const ernestAdmin = ghErnest
    ? await (async () => {
        const existingByGithub = await prisma.gitHubProfile.findUnique({
          where: { githubId: ghErnest.id },
          select: { userId: true },
        });
        if (existingByGithub) {
          return prisma.user.update({
            where: { id: existingByGithub.userId },
            data: {
              displayName: "Ernest0-Production (админ)",
              staffRoles: ["ADMIN"],
            },
          });
        }
        return prisma.user.upsert({
          where: { id: ERNEST_ADMIN_ID },
          update: {
            displayName: "Ernest0-Production (админ)",
            staffRoles: ["ADMIN"],
            githubProfile: {
              upsert: {
                create: {
                  githubId: ghErnest.id,
                  githubLogin: ERNEST_GITHUB_LOGIN,
                  githubCreatedAt: ghErnest.created_at
                    ? new Date(ghErnest.created_at)
                    : new Date("2015-01-01"),
                  accessToken: "mock_encrypted_token_ernest_admin",
                  paidRegistration: false,
                },
                update: {
                  githubId: ghErnest.id,
                  githubLogin: ERNEST_GITHUB_LOGIN,
                  githubCreatedAt: ghErnest.created_at ? new Date(ghErnest.created_at) : undefined,
                  accessToken: "mock_encrypted_token_ernest_admin",
                },
              },
            },
          },
          create: {
            id: ERNEST_ADMIN_ID,
            displayName: "Ernest0-Production (админ)",
            email: "ernest0-production-admin@example.test",
            staffRoles: ["ADMIN"],
            githubProfile: {
              create: {
                githubId: ghErnest.id,
                githubLogin: ERNEST_GITHUB_LOGIN,
                githubCreatedAt: ghErnest.created_at
                  ? new Date(ghErnest.created_at)
                  : new Date("2015-01-01"),
                accessToken: "mock_encrypted_token_ernest_admin",
                paidRegistration: false,
              },
            },
          },
        });
      })()
    : null;

  for (let i = 0; i < FAKE_SEEKER_COUNT; i++) {
    const id = fakeSeekerIds[i]!;
    const n = i + 1;
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        displayName: `Сид-соискатель ${n}`,
        email: `fake-seeker-${n}@example.test`,
        contactInfo: `@fake_seeker_${n}`,
        bio: `Автоматически созданный кандидат №${n} для наполнения откликов в dev-сиде.`,
        githubProfile: {
          create: {
            githubId: 1_001_000 + i,
            githubLogin: `referi-fake-seeker-${n}`,
            githubCreatedAt: new Date("2022-03-01"),
            accessToken: `mock_fake_seeker_token_${n}`,
            paidRegistration: false,
          },
        },
      },
    });
  }

  const vacancyIds: string[] = [];
  const frozenUntil = new Date("2099-01-01");

  for (const row of VACANCY_ROWS) {
    const id = uuidFromInt(row.intId);
    vacancyIds.push(id);
    await prisma.vacancy.upsert({
      where: { id },
      update: {
        title: row.title,
        companyName: row.companyName,
        specialty: row.specialty,
        grade: row.grade,
        workFormat: row.workFormat,
        salaryCurrency: row.salaryCurrency,
        salaryFromKopecks: row.salaryFromKopecks,
        salaryToKopecks: row.salaryToKopecks,
        description: row.description,
        rewardKopecks: row.rewardKopecks,
        status: row.status,
        frozenUntil: row.status === "FROZEN" ? frozenUntil : null,
        blockedUntil: null,
        deletedAt: null,
      },
      create: {
        id,
        referrerId: referrer.id,
        title: row.title,
        companyName: row.companyName,
        specialty: row.specialty,
        grade: row.grade,
        workFormat: row.workFormat,
        salaryCurrency: row.salaryCurrency,
        salaryFromKopecks: row.salaryFromKopecks,
        salaryToKopecks: row.salaryToKopecks,
        description: row.description,
        rewardKopecks: row.rewardKopecks,
        status: row.status,
        frozenUntil: row.status === "FROZEN" ? frozenUntil : null,
      },
    });
  }

  await prisma.application.deleteMany({
    where: { vacancyId: { in: vacancyIds } },
  });

  await prisma.vacancy.updateMany({
    where: { id: { in: vacancyIds } },
    data: { firstApplicationAt: null },
  });

  const seekerPool = [DEMO_SEEKER_ID, ...fakeSeekerIds];
  let applicationSeq = 0;

  const statuses = [
    "SUBMITTED",
    "SUBMITTED",
    "AWAITING_PAYMENT",
    "AWAITING_RESUME_HANDOFF",
    "SUBMITTED",
  ] as const;

  for (let vi = 0; vi < VACANCY_ROWS.length; vi++) {
    const row = VACANCY_ROWS[vi]!;
    const vacancyId = uuidFromInt(row.intId);
    const count = row.applicationCount;
    if (count === 0) continue;

    const seekers = pickSeekersForVacancy(vi, count, seekerPool);
    const firstAt = new Date(Date.UTC(2025, 0, 5 + vi, 10, 0, 0));

    for (let ai = 0; ai < seekers.length; ai++) {
      const seekerId = seekers[ai]!;
      applicationSeq += 1;
      const appId = uuidFromInt(0x5_000 + applicationSeq);
      const status = statuses[applicationSeq % statuses.length]!;

      await prisma.application.create({
        data: {
          id: appId,
          seekerId,
          vacancyId,
          status,
          createdAt: new Date(firstAt.getTime() + ai * 3_600_000),
          content: {
            create: {
              contactInfo: "@seed_contact",
              bio: `Короткое резюме для сида: кандидат ${seekerId.slice(0, 8)}…`,
              coverLetter:
                ai % 2 === 0 ? "Готов обсудить стек и ожидания по срокам в удобное время." : null,
            },
          },
        },
      });
    }

    await prisma.vacancy.update({
      where: { id: vacancyId },
      data: { firstApplicationAt: firstAt },
    });
  }

  console.log(
    "✅ Created users:",
    referrer.id,
    seeker.id,
    moderator.id,
    ernestAdmin ? ernestAdmin.id : "(Ernest0-Production admin skipped)",
  );
  console.log(`✅ Upserted ${FAKE_SEEKER_COUNT} fake seekers`);
  console.log(`✅ Upserted ${VACANCY_ROWS.length} vacancies with varied applications`);
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
