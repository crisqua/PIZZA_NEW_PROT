-- CreateTable
CREATE TABLE "order_daily_sequences" (
    "tenant_id" UUID NOT NULL,
    "date_key" VARCHAR(8) NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_daily_sequences_pkey" PRIMARY KEY ("tenant_id","date_key")
);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "order_code" VARCHAR(20);

-- CreateIndex
-- orderCode nullable so' durante a migracao de transicao (backfill) -- Postgres nao
-- colide NULLs entre si numa UNIQUE, entao a constraint ja' pode existir desde ja.
CREATE UNIQUE INDEX "orders_tenant_id_order_code_key" ON "orders"("tenant_id", "order_code");

-- Hand-added (RLS nao e' expressavel em schema.prisma — ver
-- docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1).

-- Row-Level Security para "order_daily_sequences" — tenant-owned de verdade, forma
-- ESTRITA (tenant_id nunca e' nulo aqui, nao existe contador de plataforma).
ALTER TABLE "order_daily_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_daily_sequences" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "order_daily_sequences"
  USING (
    "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );
