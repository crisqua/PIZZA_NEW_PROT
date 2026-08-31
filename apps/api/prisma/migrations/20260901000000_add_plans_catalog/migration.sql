-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "price" DECIMAL(10,2),
    "limit_label" VARCHAR(255),
    "modules" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- Sem secao "Hand-added": "plans" nao tem coluna tenant_id, entao scripts/check-rls.sql
-- (que so' varre tabelas que TEM tenant_id) nunca avalia esta tabela — nao precisa de
-- exclusao por nome como "tenants" precisou (essa foi excluida por nome so' porque e'
-- anterior ao gate atual; "plans" nasce ja fora do escopo do gate, sem ajuste nenhum).
