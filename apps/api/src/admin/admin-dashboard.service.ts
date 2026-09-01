import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

const MONTH_LABELS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface PlatformDashboard {
  tenantCount: number;
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

// Loop tenant-por-tenant e' a mesma necessidade documentada em AdminController.dashboard
// original (orders/subscriptions tem RLS FORCADA -- nao da pra agregar entre tenants numa
// query so'). Aqui o loop faz UMA passada por tenant (nao uma por metrica) e acumula tudo:
// orders dos ultimos 6 meses + assinatura+plano + contagem de usuarios, tudo dentro do
// mesmo runInTenantContext.
@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getDashboard(): Promise<PlatformDashboard> {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });

    const now = new Date();
    const currentMonthKey = monthKey(now);
    const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const lastMonthKey = monthKey(lastMonthDate);
    const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      monthKeys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
    }

    const perTenant = await Promise.all(
      tenants.map((tenant) =>
        this.tenantContext.runInTenantContext(tenant.id, async (tx) => {
          const [orders, subscription, userCount] = await Promise.all([
            tx.order.findMany({
              where: { createdAt: { gte: rangeStart } },
              select: { status: true, total: true, createdAt: true },
            }),
            tx.subscription.findUnique({ where: { tenantId: tenant.id }, include: { plan: true } }),
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
            subscription,
            userCount,
          };
        }),
      ),
    );

    let ordersThisMonth = 0;
    let ordersLastMonth = 0;
    let userCount = 0;
    let mrr = 0;
    const monthlyTotals = new Map<string, number>(monthKeys.map((key) => [key, 0]));
    const plansCount = new Map<string, { planCode: string; planName: string; tenantCount: number }>();

    for (const row of perTenant) {
      ordersThisMonth += row.ordersThisMonth;
      ordersLastMonth += row.ordersLastMonth;
      userCount += row.userCount;

      for (const [key, total] of row.volumeByMonth) {
        if (monthlyTotals.has(key)) {
          monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + total);
        }
      }

      if (row.subscription && row.subscription.status === 'active') {
        // Plano "Enterprise" (price null = negociado fora do sistema) nao entra na soma
        // do MRR -- nao ha valor pra somar, so' contabiliza na distribuicao por plano.
        mrr += row.subscription.plan.price?.toNumber() ?? 0;

        const code = row.subscription.plan.code;
        const existing = plansCount.get(code);
        if (existing) {
          existing.tenantCount += 1;
        } else {
          plansCount.set(code, { planCode: code, planName: row.subscription.plan.name, tenantCount: 1 });
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

    return {
      tenantCount: tenants.length,
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
