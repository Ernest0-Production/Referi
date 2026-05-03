-- CreateEnum
CREATE TYPE "SalaryCurrency" AS ENUM ('RUB', 'USD', 'EUR');

-- AlterTable
ALTER TABLE "vacancies" ADD COLUMN     "salaryCurrency" "SalaryCurrency" NOT NULL DEFAULT 'RUB';
