-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenant_id_id_key" ON "categories"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "idx_categories_tenant" ON "categories"("tenant_id");

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000) NOT NULL DEFAULT '',
    "price" DECIMAL(10,2) NOT NULL,
    "image" VARCHAR(2048) NOT NULL DEFAULT '',
    "ingredients" JSONB NOT NULL DEFAULT '[]',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_id_key" ON "products"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "idx_products_tenant_category" ON "products"("tenant_id", "category_id");

-- AddForeignKey (relacao Prisma normal, coluna unica)
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-added (RLS/FK composta nao sao expressaveis em schema.prisma — ver
-- docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1/4.1).

-- FK composta: garante que products.tenant_id nunca diverge do tenant real da categoria
-- referenciada, mesmo por bug (segunda aplicacao real do padrao do Sprint 2 —
-- refresh_tokens/users). Primeira metade da cadeia order_items->products->categories da
-- arquitetura secao 3.2 item 5; a metade order_items->products fica pra Sprint 7, que e'
-- quando orders/order_items nascem.
ALTER TABLE "products" ADD CONSTRAINT "fk_product_tenant_matches_category"
  FOREIGN KEY ("tenant_id", "category_id") REFERENCES "categories"("tenant_id", "id");

-- Row-Level Security para "categories" e "products" — dado tenant-owned de verdade, NAO
-- isento como "tenants"/"plans" (essa nao e' a excecao documentada na secao 3.1/6.3).
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;

-- Forma ESTRITA (sem o branch OR de tenant_id IS NULL que "users"/"refresh_tokens"
-- precisam) — tenant_id aqui nunca e' nulo, mesma forma de "subscriptions" (Sprint 4).
CREATE POLICY "tenant_isolation" ON "categories"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY "tenant_isolation" ON "products"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
