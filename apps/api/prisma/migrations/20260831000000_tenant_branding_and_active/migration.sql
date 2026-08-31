-- AlterTable
-- Todos os campos abaixo tem default sensato, entao um unico ADD COLUMN NOT NULL DEFAULT
-- basta -- diferente de users.password_hash (Sprint 2), que precisou do padrao seguro
-- nullable -> SET NOT NULL por nao ter default possivel.
ALTER TABLE "tenants" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tenants" ADD COLUMN "primary_color" VARCHAR(7) NOT NULL DEFAULT '#C9A84C';
ALTER TABLE "tenants" ADD COLUMN "logo" VARCHAR(8) NOT NULL DEFAULT '🍕';
ALTER TABLE "tenants" ADD COLUMN "phone" VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE "tenants" ADD COLUMN "address" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "tenants" ADD COLUMN "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN "min_order" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Nao ha' "Hand-added" nesta migration -- "tenants" nao tem RLS de proposito (ver
-- comentario no schema.prisma e docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1/6.3),
-- e nenhum campo novo e' tenant_id, entao scripts/check-rls.sql (que ja exclui "tenants"
-- por nome) nao precisa de nenhum ajuste.
