import { Tenant } from '@prisma/client';

export interface SubscriptionSummary {
  status: string;
  planCode: string;
  planName: string;
  modules: unknown;
}

type TenantSubscriptionFields = Pick<Tenant, 'subscriptionStatus' | 'planCode' | 'planName' | 'planModules'>;

// Le o resumo denormalizado gravado em Tenant (Sprint 22) -- funcao pura, sem I/O.
// Substitui o que ate a Sprint 22 exigia abrir 1 transacao por tenant (subscriptions tem
// RLS). Os 4 campos sao escritos juntos nos 2 unicos lugares que alteram assinatura
// (SubscriptionsAdminService.upsertForTenant e TenantOnboardingService.onboard) -- se
// QUALQUER um estiver null (tenant sem assinatura, caso legado/de teste), tratamos como
// null inteiro, mesmo shape que a API ja retornava antes desta sprint.
export function toSubscriptionSummary(tenant: TenantSubscriptionFields): SubscriptionSummary | null {
  if (!tenant.subscriptionStatus || !tenant.planCode || !tenant.planName) {
    return null;
  }
  return {
    status: tenant.subscriptionStatus,
    planCode: tenant.planCode,
    planName: tenant.planName,
    modules: tenant.planModules,
  };
}
