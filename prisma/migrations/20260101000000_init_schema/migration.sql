-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentKind" AS ENUM ('INITIAL', 'RENEWAL');
-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('ACTIVE', 'FROZEN', 'BLOCKED', 'DELETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('FRONTEND', 'BACKEND', 'FULLSTACK', 'IOS_MOBILE', 'ANDROID_MOBILE', 'DEVOPS', 'QA', 'DATA', 'ML_AI', 'SECURITY');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "WorkFormat" AS ENUM ('OFFICE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "SalaryCurrency" AS ENUM ('RUB', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "AttemptEvent" AS ENUM ('CONSUMED', 'REGENERATED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'AWAITING_PAYMENT', 'AWAITING_RESUME_HANDOFF', 'SEEKER_CANCEL_REQUESTED', 'AWAITING_COMPANY_DECISION', 'OFFER_ACCEPTED', 'REJECTED_BY_REFERRER', 'REJECTED_BY_COMPANY', 'CANCELLED', 'DISPUTED', 'REFUNDED_BY_SLA', 'REFUNDED_BY_CANCEL_ACK', 'REFUNDED_BY_CANCEL_AUTO', 'REFUNDED_BY_VACANCY_DELETED', 'REFUNDED_BY_MODERATOR');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'CAPTURED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReferrerSanctionType" AS ENUM ('RESUME_HANDOFF_BAN', 'REACTION_FREEZE');

-- CreateEnum
CREATE TYPE "ModeratorCaseStatus" AS ENUM ('OPEN', 'RESOLVED_FOR_REFERRER', 'RESOLVED_FOR_SEEKER');

-- CreateEnum
CREATE TYPE "AbuseReportReason" AS ENUM ('FAKE_VACANCY', 'INAPPROPRIATE_BEHAVIOR', 'FRAUD', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditActor" AS ENUM ('SYSTEM', 'SEEKER', 'REFERRER', 'MODERATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT NOT NULL,
"contactInfo" VARCHAR(500),
"bio" VARCHAR(1000),
"email" VARCHAR(320),
"staffRoles" "StaffRole" [] DEFAULT ARRAY[]::"StaffRole" [],
    "yookassaPayoutDestination" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "githubId" INTEGER NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "githubCreatedAt" TIMESTAMP(3) NOT NULL,
    "accessToken" TEXT NOT NULL,
    "paidRegistration" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "github_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeker_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "yookassaPaymentMethodId" TEXT,

    CONSTRAINT "seeker_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid (),
    "userId" UUID NOT NULL,
    "yookassaPaymentId" TEXT NOT NULL,
    "kind" "SubscriptionPaymentKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "vacancies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "companyName" VARCHAR(200) NOT NULL,
    "specialty" "Specialty" NOT NULL,
    "grade" "Grade" NOT NULL,
    "workFormat" "WorkFormat" NOT NULL,
    "salaryCurrency" "SalaryCurrency" NOT NULL DEFAULT 'RUB',
    "salaryFromKopecks" BIGINT,
    "salaryToKopecks" BIGINT,
    "description" VARCHAR(3000) NOT NULL,
    "rewardKopecks" BIGINT NOT NULL DEFAULT 0,
    "status" "VacancyStatus" NOT NULL DEFAULT 'ACTIVE',
    "frozenUntil" TIMESTAMP(3),
    "blockedUntil" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "firstApplicationAt" TIMESTAMP(3),

    CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrer_attempt_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event" "AttemptEvent" NOT NULL,
    "applicationId" UUID,
    "regeneratesAt" TIMESTAMP(3),

    CONSTRAINT "referrer_attempt_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seekerId" UUID NOT NULL,
    "vacancyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "paymentDeadline" TIMESTAMP(3),
    "resumeHandoffDeadline" TIMESTAMP(3),
    "cancelAckDeadline" TIMESTAMP(3),
    "companyDecisionDeadline" TIMESTAMP(3),
    "paidApplicationTokenId" UUID,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_contents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL,
    "contactInfo" VARCHAR(500) NOT NULL,
    "bio" VARCHAR(1000) NOT NULL,
    "coverLetter" VARCHAR(300),

    CONSTRAINT "application_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amountKopecks" BIGINT NOT NULL,
    "commissionKopecks" BIGINT NOT NULL,
    "netPayoutKopecks" BIGINT NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "yookassaPaymentId" TEXT,
"yookassaDealId" TEXT,
    "yookassaRefundId" TEXT,
    "yookassaPayoutId" TEXT,
    "heldAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "escrow_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paid_application_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seekerId" UUID NOT NULL,
    "vacancyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountKopecks" BIGINT NOT NULL,
    "yookassaPaymentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
"paidAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "paid_application_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountKopecks" BIGINT NOT NULL,
    "yookassaPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "registration_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrer_sanctions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sanctionType" "ReferrerSanctionType" NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "applicationId" UUID,

    CONSTRAINT "referrer_sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderator_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL,
    "moderatorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ModeratorCaseStatus" NOT NULL DEFAULT 'OPEN',
    "notes" VARCHAR(2000),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "moderator_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abuse_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporterId" UUID NOT NULL,
    "vacancyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" "AbuseReportReason" NOT NULL,
    "comment" VARCHAR(500),
    "resolvedAt" TIMESTAMP(3),
    "resolution" VARCHAR(500),

    CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "actor" "AuditActor" NOT NULL,
    "actorId" UUID,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_profiles_userId_key" ON "github_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "github_profiles_githubId_key" ON "github_profiles"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "seeker_subscriptions_userId_key" ON "seeker_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_yookassaPaymentId_key" ON "subscription_payments" ("yookassaPaymentId");

-- CreateIndex
CREATE INDEX "subscription_payments_userId_idx" ON "subscription_payments" ("userId");
-- CreateIndex
CREATE INDEX "vacancies_status_specialty_grade_workFormat_idx" ON "vacancies"("status", "specialty", "grade", "workFormat");

-- CreateIndex
CREATE INDEX "vacancies_referrerId_idx" ON "vacancies"("referrerId");

-- CreateIndex
CREATE INDEX "referrer_attempt_ledger_referrerId_event_idx" ON "referrer_attempt_ledger"("referrerId", "event");

-- CreateIndex
CREATE INDEX "applications_vacancyId_status_idx" ON "applications"("vacancyId", "status");

-- CreateIndex
CREATE INDEX "applications_seekerId_status_idx" ON "applications"("seekerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_seekerId_vacancyId_key" ON "applications"("seekerId", "vacancyId");

-- CreateIndex
CREATE UNIQUE INDEX "application_contents_applicationId_key" ON "application_contents"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_transactions_applicationId_key" ON "escrow_transactions"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_transactions_yookassaPaymentId_key" ON "escrow_transactions"("yookassaPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_transactions_yookassaDealId_key" ON "escrow_transactions" ("yookassaDealId");
-- CreateIndex
CREATE UNIQUE INDEX "escrow_transactions_yookassaRefundId_key" ON "escrow_transactions"("yookassaRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_transactions_yookassaPayoutId_key" ON "escrow_transactions"("yookassaPayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "paid_application_tokens_yookassaPaymentId_key" ON "paid_application_tokens"("yookassaPaymentId");

-- CreateIndex
CREATE INDEX "paid_application_tokens_seekerId_vacancyId_idx" ON "paid_application_tokens"("seekerId", "vacancyId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_payments_yookassaPaymentId_key" ON "registration_payments"("yookassaPaymentId");

-- CreateIndex
CREATE INDEX "referrer_sanctions_referrerId_expiresAt_idx" ON "referrer_sanctions"("referrerId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "moderator_cases_applicationId_key" ON "moderator_cases"("applicationId");

-- CreateIndex
CREATE INDEX "audit_logs_applicationId_createdAt_idx" ON "audit_logs"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "github_profiles" ADD CONSTRAINT "github_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeker_subscriptions" ADD CONSTRAINT "seeker_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments"
ADD CONSTRAINT "subscription_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "seeker_subscriptions" ("userId") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrer_attempt_ledger" ADD CONSTRAINT "referrer_attempt_ledger_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_contents" ADD CONSTRAINT "application_contents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_transactions" ADD CONSTRAINT "escrow_transactions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrer_sanctions" ADD CONSTRAINT "referrer_sanctions_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderator_cases" ADD CONSTRAINT "moderator_cases_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderator_cases" ADD CONSTRAINT "moderator_cases_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "vacancy_search_presets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "params" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancy_search_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vacancy_search_presets_userId_idx" ON "vacancy_search_presets"("userId");

-- AddForeignKey
ALTER TABLE "vacancy_search_presets" ADD CONSTRAINT "vacancy_search_presets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
