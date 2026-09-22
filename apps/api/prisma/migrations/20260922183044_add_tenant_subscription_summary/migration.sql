-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "plan_code" VARCHAR(40),
ADD COLUMN     "plan_modules" JSONB,
ADD COLUMN     "plan_name" VARCHAR(120),
ADD COLUMN     "subscription_status" VARCHAR(20);
