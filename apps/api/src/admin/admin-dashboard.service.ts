import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

// Sprint "Mudanca de Dashboard" (2026-09-26): ate aqui, este servico tambem somava
// pedidos/usuarios dos ultimos 6 meses de CADA tenant, abrindo 1 transacao por tenant
// (RLS de orders/users) -- 47s de carga fria com 135 tenants no homolog, crescendo
// linear com o numero de pizzarias (ver Sprint 23). Removido por completo: o usuario
// decidiu que esse agregado cross-tenant nao e' util no dia a dia -- ele consulta
// pedidos/receita/usuarios de UMA pizzaria por vez (ver TenantsAdminService.getSales).
// O que sobra aqui (MRR/distribuicao por plano/contagem aberta-fechada) ja e' O(1)
// desde as Sprints 22/27 -- nunca abriu transacao de tenant, so' le "tenants"+"plans".
const DASHBOARD_CACHE_KEY = 'admin:dashboard';
// TTL curto de novo (era 600s so' pra absorver o custo do loop que acabou de sair) --
// recalcular agora e' 1 consulta so', barato o suficiente pra nao precisar de TTL longo.
const DASHBOARD_CACHE_TTL_SECONDS = 90;

export interface PlatformDashboard {
  tenantCount: number;
  // Sprint 27 introduziu Tenant.isOpen (toggle manual do dono) -- "tenants" ja' vem
  // carregado por completo aqui pra somar MRR/distribuicao por plano, entao contar
  // aberto/fechado e' so' um filter() sobre o MESMO dado, sem consulta nova.
  openTenantCount: number;
  closedTenantCount: number;
  mrr: number;
  plansDistribution: Array<{ planCode: string; planName: string; tenantCount: number }>;
}

// Ate a Sprint 22, o loop tenant-por-tenant tambem buscava a assinatura+plano de cada
// tenant (subscriptions tem RLS forcada) -- 3 queries por tenant, cresceu junto com o
// numero de pizzarias ate derrubar o endpoint com 500 em producao (44 tenants). MRR e
// distribuicao por plano NAO precisam de loop: "tenants" ja carrega o resumo
// denormalizado (subscriptionStatus/planCode/planName) e "plans" (preco) tambem nao tem
// RLS -- as duas juntas resolvem isso numa unica leitura, sem abrir nenhuma transacao de
// tenant.
@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getDashboard(): Promise<PlatformDashboard> {
    const cached = await this.cache.get<PlatformDashboard>(DASHBOARD_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const dashboard = await this.computeDashboard();
    await this.cache.set(DASHBOARD_CACHE_KEY, dashboard, DASHBOARD_CACHE_TTL_SECONDS);
    return dashboard;
  }

  private async computeDashboard(): Promise<PlatformDashboard> {
    const [tenants, plans] = await Promise.all([
      this.prisma.tenant.findMany({
        select: { subscriptionStatus: true, planCode: true, planName: true, isOpen: true },
      }),
      this.prisma.plan.findMany({ select: { code: true, price: true } }),
    ]);
    const planPriceByCode = new Map(plans.map((plan) => [plan.code, plan.price?.toNumber() ?? 0]));

    let mrr = 0;
    const plansCount = new Map<string, { planCode: string; planName: string; tenantCount: number }>();
    for (const tenant of tenants) {
      if (tenant.subscriptionStatus !== 'active' || !tenant.planCode || !tenant.planName) {
        continue;
      }
      // Plano "Enterprise" (price null = negociado fora do sistema) nao entra na soma
      // do MRR -- nao ha valor pra somar, so' contabiliza na distribuicao por plano.
      mrr += planPriceByCode.get(tenant.planCode) ?? 0;

      const existing = plansCount.get(tenant.planCode);
      if (existing) {
        existing.tenantCount += 1;
      } else {
        plansCount.set(tenant.planCode, { planCode: tenant.planCode, planName: tenant.planName, tenantCount: 1 });
      }
    }

    const openTenantCount = tenants.filter((t) => t.isOpen).length;

    return {
      tenantCount: tenants.length,
      openTenantCount,
      closedTenantCount: tenants.length - openTenantCount,
      mrr: Math.round(mrr * 100) / 100,
      plansDistribution: [...plansCount.values()],
    };
  }
}
