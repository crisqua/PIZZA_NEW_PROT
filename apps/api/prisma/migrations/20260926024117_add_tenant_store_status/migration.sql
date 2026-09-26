-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "closing_time" VARCHAR(5),
ADD COLUMN     "estimated_delivery_minutes" INTEGER,
ADD COLUMN     "is_open" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "open_weekends" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "opening_time" VARCHAR(5);
