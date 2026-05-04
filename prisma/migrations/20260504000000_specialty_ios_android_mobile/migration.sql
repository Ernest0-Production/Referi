-- Split Specialty MOBILE into IOS_MOBILE and ANDROID_MOBILE.
-- Existing vacancies with MOBILE become OTHER (platform not inferred).

ALTER TYPE "Specialty" ADD VALUE 'IOS_MOBILE';
ALTER TYPE "Specialty" ADD VALUE 'ANDROID_MOBILE';

UPDATE "vacancies" SET "specialty" = 'OTHER' WHERE "specialty" = 'MOBILE';

ALTER TYPE "Specialty" RENAME TO "Specialty_old";

CREATE TYPE "Specialty" AS ENUM (
  'FRONTEND',
  'BACKEND',
  'FULLSTACK',
  'IOS_MOBILE',
  'ANDROID_MOBILE',
  'DEVOPS',
  'QA',
  'DATA',
  'ML_AI',
  'SECURITY',
  'OTHER'
);

ALTER TABLE "vacancies"
  ALTER COLUMN "specialty" TYPE "Specialty"
  USING ("specialty"::text::"Specialty");

DROP TYPE "Specialty_old";
