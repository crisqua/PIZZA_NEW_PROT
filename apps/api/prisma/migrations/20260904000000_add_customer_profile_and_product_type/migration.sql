-- AlterTable
-- Perfil de entrega do cliente (Sprint 7) — preenchido de verdade so' pra role:'customer',
-- vazio pros demais papeis. Default '' seguro (sem backfill necessario alem do default).
ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "address" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "address_number" VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "complement" VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "neighborhood" VARCHAR(120) NOT NULL DEFAULT '';

-- AlterTable
-- 'pizza' | 'drink' (Sprint 7) — validado em codigo. Default 'pizza' backfilla os
-- produtos ja cadastrados desde a Sprint 5 sem quebrar nada.
ALTER TABLE "products" ADD COLUMN "type" VARCHAR(20) NOT NULL DEFAULT 'pizza';
