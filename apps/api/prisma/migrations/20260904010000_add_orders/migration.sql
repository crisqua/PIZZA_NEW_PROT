-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "idempotency_key" VARCHAR(255) NOT NULL,
    "customer_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "address_number" VARCHAR(20) NOT NULL DEFAULT '',
    "complement" VARCHAR(120) NOT NULL DEFAULT '',
    "neighborhood" VARCHAR(120) NOT NULL DEFAULT '',
    "payment_method" VARCHAR(20) NOT NULL,
    "change_for" DECIMAL(10,2),
    "delivery_fee" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_id_key" ON "orders"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_idempotency_key_key" ON "orders"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "idx_orders_tenant_customer" ON "orders"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "idx_orders_tenant_status" ON "orders"("tenant_id", "status");

-- AddForeignKey (relacao Prisma normal, coluna unica)
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "second_product_id" UUID,
    "type" VARCHAR(20) NOT NULL,
    "size" VARCHAR(20),
    "name" VARCHAR(200) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_order_items_tenant_order" ON "order_items"("tenant_id", "order_id");

-- AddForeignKey (relacoes Prisma normais, colunas unicas)
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_second_product_id_fkey" FOREIGN KEY ("second_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-added (RLS/FK composta nao sao expressaveis em schema.prisma — ver
-- docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1/4.1). Cadeia
-- order_items->products->categories comecada na Sprint 5 (fk_product_tenant_matches_category)
-- se completa aqui com order_items->orders e order_items->products (as duas pernas).

-- FK composta: garante que orders.tenant_id nunca diverge do tenant real do customer
-- (User) referenciado, mesmo por bug — mesmo padrao de fk_product_tenant_matches_category.
ALTER TABLE "orders" ADD CONSTRAINT "fk_order_tenant_matches_customer"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "users"("tenant_id", "id");

-- FK composta: garante que order_items.tenant_id nunca diverge do tenant real do pedido.
ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_item_tenant_matches_order"
  FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id");

-- FK composta: garante que product_id nunca aponte pra um produto de outro tenant
-- (teste obrigatorio: arquitetura secao 3.2 item 5).
ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_item_tenant_matches_product"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "products"("tenant_id", "id");

-- FK composta pro segundo sabor (pizza meio a meio) — coluna nullable. MATCH SIMPLE
-- (default do Postgres) satisfaz a constraint automaticamente quando second_product_id
-- IS NULL, mesmo raciocinio ja documentado em fk_refresh_token_tenant_matches_user.
ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_item_tenant_matches_second_product"
  FOREIGN KEY ("tenant_id", "second_product_id") REFERENCES "products"("tenant_id", "id");

-- Row-Level Security para "orders" e "order_items" — dado tenant-owned de verdade, forma
-- ESTRITA (tenant_id nunca nulo), mesma forma de "categories"/"products"/"subscriptions"/
-- "inventory_items".
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "orders"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY "tenant_isolation" ON "order_items"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
