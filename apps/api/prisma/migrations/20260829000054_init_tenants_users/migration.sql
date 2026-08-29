-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "email" VARCHAR(160) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "idx_users_tenant" ON "users"("tenant_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_id_key" ON "users"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-added (RLS/CHECK nao sao expressaveis em schema.prisma — ver
-- docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1).

-- CHECK: so platform_superadmin pode ter tenant_id NULL (usuarios de plataforma nao
-- pertencem a um tenant; todos os outros papeis precisam de um).
ALTER TABLE "users" ADD CONSTRAINT "chk_platform_superadmin_no_tenant" CHECK (
  ("role" = 'platform_superadmin' AND "tenant_id" IS NULL) OR
  ("role" != 'platform_superadmin' AND "tenant_id" IS NOT NULL)
);

-- Row-Level Security para "users" — a UNICA tabela tenant-owned ate agora.
-- "tenants" fica de fora de proposito (excecao documentada na secao 3.1): a plataforma
-- precisa enxergar todos os tenants ao mesmo tempo; isolamento la e por rota/RBAC, nao RLS.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;

-- NULLIF(...,'') trata o caso de current_setting() retornar '' (nao NULL) quando a
-- variavel de sessao nunca foi setada numa conexao reaproveitada do pool. O branch OR
-- pra tenant_id NULL so e necessario aqui porque users.tenant_id e a unica coluna
-- tenant_id anulavel do schema (usuarios de plataforma). Tabelas futuras com tenant_id
-- NOT NULL devem usar a forma estrita, sem esse branch.
CREATE POLICY "tenant_isolation" ON "users"
  USING (
    "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR ("tenant_id" IS NULL AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
  );

