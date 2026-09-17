-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "cnpj" VARCHAR(18);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");
