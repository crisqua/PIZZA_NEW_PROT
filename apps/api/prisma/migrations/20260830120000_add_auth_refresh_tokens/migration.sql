-- AlterTable
-- Adicionada como nullable primeiro, depois SET NOT NULL, mesmo sem backfill necessario
-- (Sprint 1 nao escreveu nenhuma linha em "users" ainda) -- rede de seguranca caso essa
-- suposicao esteja errada no momento em que a migration rodar contra o homolog.
ALTER TABLE "users" ADD COLUMN "password_hash" VARCHAR(255);
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "family_id" UUID NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_family" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_tenant_user" ON "refresh_tokens"("tenant_id", "user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-added (RLS/CHECK/FK composta nao sao expressaveis em schema.prisma — ver
-- docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1/4.1).

-- FK composta: garante que refresh_tokens.tenant_id nunca diverge do tenant real do
-- usuario (mesmo padrao de order_items->products/orders da arquitetura secao 4.1).
-- MATCH SIMPLE (default do Postgres) significa que a constraint e satisfeita
-- automaticamente quando tenant_id IS NULL (caso platform_superadmin).
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_token_tenant_matches_user"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id");

-- Row-Level Security para "refresh_tokens" — dado tenant-owned igual "users", NAO isento
-- como "tenants" (essa nao e a excecao documentada na secao 3.1/6.3).
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" FORCE ROW LEVEL SECURITY;

-- Mesmo padrao NULLIF(...) de "users": trata current_setting() retornando '' (variavel de
-- sessao nunca setada numa conexao reaproveitada do pool) e o caso tenant_id IS NULL
-- (refresh token de platform_superadmin).
CREATE POLICY "tenant_isolation" ON "refresh_tokens"
  USING (
    "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR ("tenant_id" IS NULL AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
  );
