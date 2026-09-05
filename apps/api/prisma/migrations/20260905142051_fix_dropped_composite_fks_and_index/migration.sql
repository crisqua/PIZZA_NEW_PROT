-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_second_product_id_fkey";

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_second_product_id_fkey" FOREIGN KEY ("second_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CORRECAO da migration anterior (20260905141851_add_product_size_prices): o diff
-- automatico do Prisma dropou 6 constraints/index hand-written (nao expressos no DSL do
-- schema.prisma, entao invisiveis pro diff) e nunca recriou. Re-adicionando aqui, SQL
-- identico ao original de cada migration que os criou (fk_refresh_token_tenant_matches_user
-- em 20260830120000, fk_product_tenant_matches_category em 20260902000000,
-- idx_inventory_items_tenant em 20260903000000, os 3 fk_order*/fk_order_item* em
-- 20260904010000). Nao e' opcional: sao a garantia de isolamento cross-tenant a nivel de
-- banco (arquitetura secao 4.1) -- sem eles, RLS sozinha ainda protege leitura/escrita
-- por tenant_id, mas nao impede um bug de aplicacao gravar um tenant_id inconsistente com
-- o dono real da linha referenciada.
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_token_tenant_matches_user"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id");

ALTER TABLE "products" ADD CONSTRAINT "fk_product_tenant_matches_category"
  FOREIGN KEY ("tenant_id", "category_id") REFERENCES "categories"("tenant_id", "id");

CREATE INDEX "idx_inventory_items_tenant" ON "inventory_items"("tenant_id");

ALTER TABLE "orders" ADD CONSTRAINT "fk_order_tenant_matches_customer"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "users"("tenant_id", "id");

ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_item_tenant_matches_order"
  FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id");

ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_item_tenant_matches_product"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "products"("tenant_id", "id");

ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_item_tenant_matches_second_product"
  FOREIGN KEY ("tenant_id", "second_product_id") REFERENCES "products"("tenant_id", "id");
