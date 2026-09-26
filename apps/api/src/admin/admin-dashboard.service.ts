import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { mapWithConcurrency } from '../common/concurrency.util';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

const TENANT_CONCURRENCY = 5;

// Sprint 23: mesmo depois da Sprint 22 (que tirou a assinatura do loop por tenant), o
// dashboard ainda soma pedidos dos ultimos 6 meses de CADA tenant -- isso genuinamente
// precisa de RLS, nao da pra denormalizar sem reagregar a cada pedido novo. E' uma foto
// agregada da plataforma pro superadmin, nao precisa ser exata ao segundo -- cachear por
// um tempo curto absorve a maior parte das chamadas repetidas sem esconder dado por
// muito tempo. Sem invalidacao ativa de proposito (nenhum evento dispara "recalcula
// agora") -- o TTL curto sozinho ja e' a garantia de frescor aceita aqui.
const DASHBOARD_CACHE_KEY = 'admin:dashboard';
const DASHBOARD_CACHE_TTL_SECONDS = 90;

const MONTH_LABELS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface PlatformDashboard {
  tenantCount: number;
  // Sprint 27 introduziu Tenant.isOpen (toggle manual do dono) -- "tenants" ja' vem
  // carregado por completo aqui pra somar MRR/distribuicao por plano, entao contar
  // aberto/fechado e' so' um filter() sobre o MESMO dado, sem consulta nova nem o loop
  // por tenant que a parte de pedidos/usuarios deste dashboard precisa (essa sim tem RLS).
  openTenantCount: number;
  closedTenantCount: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  mrr: number;
  userCount: number;
  monthlyOrderVolume: Array<{ month: string; total: number }>;
  plansDistribution: Array<{ planCode: string; planName: string; tenantCount: number }>;
  topTenants: Array<{ name: string; slug: string; ordersThisMonth: number; revenueThisMonth: number }>;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Ate a Sprint 22, o loop tenant-por-tenant tambem buscava a assinatura+plano de cada
// tenant (subscriptions tem RLS forcada) -- 3 queries por tenant, cresceu junto com o
// numero de pizzarias ate derrubar o endpoint com 500 em producao (44 tenants). MRR e
// distribuicao por plano NAO precisam mais do loop: "tenants" ja carrega o resumo
// denormalizado (subscriptionStatus/planCode/planName) e "plans" (preco) tambem nao tem
// RLS -- as duas juntas resolvem isso numa unica leitura, sem abrir nenhuma transacao de
// tenant. O loop por tenant continua existindo so' pro que genuinamente precisa de RLS:
// pedidos e contagem de usuarios.
@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
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
        select: { id: true, name: true, slug: true, subscriptionStatus: true, planCode: true, planName: true, isOpen: true },
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

    const now = new Date();
    const currentMonthKey = monthKey(now);
    const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const lastMonthKey = monthKey(lastMonthDate);
    const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      monthKeys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
    }

    // Lotes de TENANT_CONCURRENCY em vez de todos de uma vez (Promise.all direto) --
    // ver comentario em concurrency.util.ts. So' pedidos + usuarios agora (a parte de
    // assinatura saiu do loop acima).
    const perTenant = await mapWithConcurrency(tenants, TENANT_CONCURRENCY, (tenant) =>
      this.tenantContext.runInTenantContext(tenant.id, async (tx) => {
          const [orders, userCount] = await Promise.all([
            tx.order.findMany({
              where: { createdAt: { gte: rangeStart } },
              select: { status: true, total: true, createdAt: true },
            }),
            tx.user.count(),
          ]);

          let ordersThisMonth = 0;
          let ordersLastMonth = 0;
          let revenueThisMonth = 0;
          const volumeByMonth = new Map<string, number>();

          for (const order of orders) {
            const key = monthKey(order.createdAt);
            if (key === currentMonthKey) ordersThisMonth += 1;
            if (key === lastMonthKey) ordersLastMonth += 1;
            // Mesma convencao da Sprint 8 (RevenueService): so' pedido 'completed' e'
            // dinheiro que entrou de verdade.
            if (order.status === 'completed') {
              const total = order.total.toNumber();
              if (key === currentMonthKey) revenueThisMonth += total;
              volumeByMonth.set(key, (volumeByMonth.get(key) ?? 0) + total);
            }
          }

          return {
            tenant,
            ordersThisMonth,
            ordersLastMonth,
            revenueThisMonth,
            volumeByMonth,
            userCount,
          };
        }),
    );

    let ordersThisMonth = 0;
    let ordersLastMonth = 0;
    let userCount = 0;
    const monthlyTotals = new Map<string, number>(monthKeys.map((key) => [key, 0]));

    for (const row of perTenant) {
      ordersThisMonth += row.ordersThisMonth;
      ordersLastMonth += row.ordersLastMonth;
      userCount += row.userCount;

      for (const [key, total] of row.volumeByMonth) {
        if (monthlyTotals.has(key)) {
          monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + total);
        }
      }
    }

    const topTenants = perTenant
      .filter((row) => row.revenueThisMonth > 0)
      .sort((a, b) => b.revenueThisMonth - a.revenueThisMonth)
      .slice(0, 5)
      .map((row) => ({
        name: row.tenant.name,
        slug: row.tenant.slug,
        ordersThisMonth: row.ordersThisMonth,
        revenueThisMonth: Math.round(row.revenueThisMonth * 100) / 100,
      }));

    const openTenantCount = tenants.filter((t) => t.isOpen).length;

    return {
      tenantCount: tenants.length,
      openTenantCount,
      closedTenantCount: tenants.length - openTenantCount,
      ordersThisMonth,
      ordersLastMonth,
      mrr: Math.round(mrr * 100) / 100,
      userCount,
      monthlyOrderVolume: monthKeys.map((key) => ({
        month: MONTH_LABELS_PT[Number(key.split('-')[1]) - 1],
        total: Math.round((monthlyTotals.get(key) ?? 0) * 100) / 100,
      })),
      plansDistribution: [...plansCount.values()],
      topTenants,
    };
  }
}
