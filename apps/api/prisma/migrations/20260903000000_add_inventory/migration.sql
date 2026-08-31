-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "min_quantity" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_inventory_items_tenant" ON "inventory_items"("tenant_id");

-- Hand-added (RLS nao e' expressavel em schema.prisma — ver
-- docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1). Sem FK composta: "inventory_items"
-- nao referencia nenhuma outra tabela tenant-scoped.

-- Row-Level Security para "inventory_items" — dado tenant-owned de verdade, mesma forma
-- estrita de "categories"/"products"/"subscriptions" (tenant_id nunca nulo).
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "inventory_items"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
