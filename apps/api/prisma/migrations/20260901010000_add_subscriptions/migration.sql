-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- AddForeignKey
-- FKs simples, sem composta: "tenants"/"plans" nao tem tenant_id nenhum pra compor
-- contra (o padrao de FK composta do Sprint 2 existe pra garantir consistencia entre
-- duas tabelas RLS-protegidas que compartilham tenant_id — nao se aplica aqui).
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-added (RLS nao e' expressavel em schema.prisma — ver
-- docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.1).

-- Row-Level Security para "subscriptions" — dado tenant-owned de verdade, NAO isento
-- como "tenants"/"plans" (essa nao e' a excecao documentada na secao 3.1/6.3).
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;

-- Forma ESTRITA (sem o branch OR de tenant_id IS NULL que "users"/"refresh_tokens"
-- precisam): tenant_id aqui nunca e' nulo (nao existe assinatura de plataforma) —
-- exatamente o caso que o comentario da migration do Sprint 1 ja antecipava ("tabelas
-- futuras com tenant_id NOT NULL devem usar a forma estrita, sem esse branch").
-- NULLIF(...,'') mantido mesmo com coluna NOT NULL: protege contra current_setting()
-- retornar '' (nao NULL) numa conexao reaproveitada do pool sem SET LOCAL fresco nesta
-- transacao — um ''::uuid direto da erro forte, NULLIF vira NULL e so' falha o match.
CREATE POLICY "tenant_isolation" ON "subscriptions"
  USING (
    "tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );
