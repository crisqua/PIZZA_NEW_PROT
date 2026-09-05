-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "fk_order_item_tenant_matches_order";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "fk_order_item_tenant_matches_product";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "fk_order_item_tenant_matches_second_product";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_second_product_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "fk_order_tenant_matches_customer";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "fk_product_tenant_matches_category";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "fk_refresh_token_tenant_matches_user";

-- DropIndex
DROP INDEX "idx_inventory_items_tenant";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "price_brotinho" DECIMAL(10,2),
ADD COLUMN     "price_doze_pedacos" DECIMAL(10,2),
ADD COLUMN     "price_oito_pedacos" DECIMAL(10,2);

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_second_product_id_fkey" FOREIGN KEY ("second_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
