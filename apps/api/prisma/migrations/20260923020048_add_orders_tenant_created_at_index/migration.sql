-- CreateIndex
CREATE INDEX "idx_orders_tenant_created_at" ON "orders"("tenant_id", "created_at");
