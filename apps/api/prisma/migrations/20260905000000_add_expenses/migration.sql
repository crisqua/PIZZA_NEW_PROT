-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_expenses_tenant_date" ON "expenses"("tenant_id", "date");

-- Hand-added (RLS nao e' expressavel em schema.prisma — ver
-- docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1). Sem FK composta: "expenses" nao
-- referencia nenhuma outra tabela tenant-scoped, mesmo caso de "inventory_items".

-- Row-Level Security para "expenses" — dado tenant-owned de verdade, mesma forma estrita
-- de "categories"/"products"/"subscriptions"/"inventory_items" (tenant_id nunca nulo).
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "expenses"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
