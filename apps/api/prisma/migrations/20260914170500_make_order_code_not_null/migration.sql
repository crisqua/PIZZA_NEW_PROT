-- AlterTable
-- Seguro so' depois do backfill (script descartavel rodado a mao contra homolog) ter
-- preenchido order_code em todo pedido existente -- confirmado sem NULL/duplicata antes
-- de aplicar esta migration.
ALTER TABLE "orders" ALTER COLUMN "order_code" SET NOT NULL;
