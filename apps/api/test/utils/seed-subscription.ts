import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';

export interface SeededPlan {
  id: string;
  code: string;
}

// "plans" nao tem RLS -- insert direto pelo client global.
export async function seedPlan(
  prisma: PrismaService,
  options: { modules?: string[]; price?: number | null } = {},
): Promise<SeededPlan> {
  const code = `test-${randomUUID().slice(0, 8)}`;
  const plan = await prisma.plan.create({
    data: { code, name: code, price: options.price ?? 0, modules: options.modules ?? [] },
  });
  return { id: plan.id, code: plan.code };
}

export async function cleanupPlan(prisma: PrismaService, plan: SeededPlan): Promise<void> {
  await prisma.plan.delete({ where: { id: plan.id } });
}

// "subscriptions" tem RLS de verdade -- precisa rodar dentro do runInTenantContext,
// mesma disciplina de refresh_tokens/users em seed-auth-fixtures.ts.
//
// Tambem grava o resumo denormalizado em "tenants" (Sprint 22, ver
// tenant-subscription-summary.util.ts) -- reproduz o mesmo par de escritas que
// SubscriptionsAdminService.upsertForTenant/TenantOnboardingService.onboard fazem em
// producao. Sem isso, testes que seedam assinatura direto (bypassando os services reais)
// nunca preencheriam os campos que a listagem/dashboard passaram a ler.
export async function seedSubscription(
  prisma: PrismaService,
  tenantContext: TenantContextService,
  tenantId: string,
  planId: string,
  status: 'active' | 'cancelled' = 'active',
): Promise<void> {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId } });
  await tenantContext.runInTenantContext(tenantId, (tx) =>
    tx.subscription.create({ data: { tenantId, planId, status } }),
  );
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { subscriptionStatus: status, planCode: plan.code, planName: plan.name, planModules: plan.modules ?? undefined },
  });
}

// Chamar ANTES de cleanupTenantWithUser -- subscriptions.tenant_id tem FK RESTRICT contra
// tenants(id), apagar o tenant primeiro quebraria com violacao de FK.
export async function cleanupSubscription(tenantContext: TenantContextService, tenantId: string): Promise<void> {
  await tenantContext.runInTenantContext(tenantId, (tx) => tx.subscription.deleteMany({ where: { tenantId } }));
}
