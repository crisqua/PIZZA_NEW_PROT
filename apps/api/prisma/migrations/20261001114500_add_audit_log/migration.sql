-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "actor_id" UUID,
    "actor_email" VARCHAR(160) NOT NULL,
    "actor_role" VARCHAR(20) NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "target_type" VARCHAR(40),
    "target_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs_archive" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "actor_id" UUID,
    "actor_email" VARCHAR(160) NOT NULL,
    "actor_role" VARCHAR(20) NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "target_type" VARCHAR(40),
    "target_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_archive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_logs_tenant_created" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_only" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_target" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_archive_tenant_created" ON "audit_logs_archive"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_archive_created_only" ON "audit_logs_archive"("created_at");

-- Hand-added (RLS nao e' expressavel em schema.prisma — ver
-- docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1). Mesmo carve-out EXATO da policy de
-- "users" (20260829000054_init_tenants_users/migration.sql) -- audit_logs/audit_logs_archive
-- sao as 2 unicas outras tabelas do schema, alem de users, com tenant_id anulavel
-- (eventos de plataforma, ex. login de superadmin, tenant_id NULL).
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "audit_logs"
  USING (
    "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR ("tenant_id" IS NULL AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
  );

ALTER TABLE "audit_logs_archive" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs_archive" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "audit_logs_archive"
  USING (
    "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR ("tenant_id" IS NULL AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
  );
