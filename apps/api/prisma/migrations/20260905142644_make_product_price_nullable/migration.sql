-- AlterTable
-- (Prisma's diff also proposed dropping 6 hand-written composite FK
-- constraints/index it can't see in schema.prisma's DSL -- same drift explained in
-- migration 20260905142051's comment. Stripped here on purpose: they already exist
-- correctly in the DB, nothing about them needs to change for this column edit.)
ALTER TABLE "products" ALTER COLUMN "price" DROP NOT NULL;
