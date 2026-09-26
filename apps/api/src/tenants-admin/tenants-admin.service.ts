import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { resolveCnpj } from '../common/cnpj.util';
import { tenantBrandingCacheKey } from '../common/tenant-branding-cache-key';
import { toTenantResponse } from '../common/tenant-response.util';
import { SubscriptionSummary, toSubscriptionSummary } from '../common/tenant-subscription-summary.util';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TenantSales {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  ordersThisMonth: number;
  ordersLastMonth: number;
  revenueThisMonth: number;
  userCount: number;
  monthlyOrderVolume: Array<{ month: string; ordersCompleted: number; revenue: number }>;
}

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';
const MONTH_LABELS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
// TTL curto so' pra evitar recalcular se o superadmin voltar a olhar a mesma pizzaria
// em seguida na mesma sessao -- consulta ja e' barata (1 transacao, nao um loop), o
// cache aqui e' conveniencia, nao necessidade (ver Sprint "Mudanca de Dashboard").
const TENANT_SALES_CACHE_TTL_SECONDS = 60;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function tenantSalesCacheKey(tenantId: string): string {
  return `admin:tenant-sales:${tenantId}`;
}

@Injectable()
export class TenantsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateTenantDto) {
    const cnpj = resolveCnpj(dto.cnpj);
    try {
      // active nunca vem do body -- toda pizzaria nasce ativa, so' o toggle dedicado
      // desativa. Nada a invalidar no cache: slug novo, a chave nunca existiu.
      const tenant = await this.prisma.tenant.create({ data: { ...dto, cnpj } });
      return toTenantResponse(tenant);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Slug ou CNPJ ja esta em uso.');
      }
      throw err;
    }
  }

  // Enriquecido com um resumo de assinatura por tenant (Sprint 10, denormalizado na
  // Sprint 22) -- serve pro badge de plano que TenantsManagement.tsx ja mostra hoje. Ate
  // a Sprint 22 cada resumo abria a propria transacao (subscriptions tem RLS) -- 1 por
  // tenant, crescia linear com o numero de pizzarias e chegou a derrubar o endpoint com
  // 500 em producao (44 tenants). Os 4 campos denormalizados em Tenant (ver
  // schema.prisma) tornam isso 1 query so', independente de quantas pizzarias existirem.
  async list(
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<Paginated<ReturnType<typeof toTenantResponse> & { subscription: SubscriptionSummary | null }>> {
    const where: Prisma.TenantWhereInput | undefined = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] }
      : undefined;

    const [rows, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const items = rows.map((tenant) => ({
      ...toTenantResponse(tenant),
      subscription: toSubscriptionSummary(tenant),
    }));

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException();
    }
    return toTenantResponse(tenant);
  }

  async update(id: string, dto: UpdateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }
    const cnpj = resolveCnpj(dto.cnpj);

    try {
      const updated = await this.prisma.tenant.update({ where: { id }, data: { ...dto, cnpj } });

      // Se o slug mudou, invalida a chave ANTIGA (a nova nunca existiu no cache ainda).
      if (dto.slug && dto.slug !== existing.slug) {
        await this.cache.del(tenantBrandingCacheKey(existing.slug));
      }
      await this.cache.del(tenantBrandingCacheKey(updated.slug));

      return toTenantResponse(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Slug ou CNPJ ja esta em uso.');
      }
      throw err;
    }
  }

  async setActive(id: string, active: boolean) {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }
    const updated = await this.prisma.tenant.update({ where: { id }, data: { active } });
    // Invalida mesmo "active" nao fazendo parte do payload publico -- mais barato que
    // decidir campo a campo o que afeta a resposta publica, e fecha qualquer bug futuro
    // se o shape publico crescer.
    await this.cache.del(tenantBrandingCacheKey(updated.slug));
    return toTenantResponse(updated);
  }

  // Sprint "Mudanca de Dashboard" (2026-09-26): substitui o agregado cross-tenant que
  // saiu do AdminDashboardService -- consulta pedidos/receita/usuarios de UMA pizzaria
  // por vez, sob demanda. Abre 1 unica transacao (RLS de orders/users), nunca um loop
  // pelas N pizzarias -- custo constante, nao cresce com o total de tenants na
  // plataforma (mesmo calculo que o dashboard antigo fazia por tenant, so' que rodando
  // uma vez so', pro tenant pedido).
  async getSales(tenantId: string): Promise<TenantSales> {
    const cached = await this.cache.get<TenantSales>(tenantSalesCacheKey(tenantId));
    if (cached) {
      return cached;
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, slug: true } });
    if (!tenant) {
      throw new NotFoundException();
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

    const { ordersThisMonth, ordersLastMonth, revenueThisMonth, monthlyTotals, userCount } =
      await this.tenantContext.runInTenantContext(tenantId, async (tx) => {
        const [orders, userCountResult] = await Promise.all([
          tx.order.findMany({
            where: { createdAt: { gte: rangeStart } },
            select: { status: true, total: true, createdAt: true },
          }),
          tx.user.count(),
        ]);

        let thisMonth = 0;
        let lastMonth = 0;
        let revenueThis = 0;
        const totals = new Map<string, { ordersCompleted: number; revenue: number }>(
          monthKeys.map((key) => [key, { ordersCompleted: 0, revenue: 0 }]),
        );

        for (const order of orders) {
          const key = monthKey(order.createdAt);
          if (key === currentMonthKey) thisMonth += 1;
          if (key === lastMonthKey) lastMonth += 1;
          // Mesma convencao da Sprint 8 (RevenueService): so' pedido 'completed' e'
          // dinheiro que entrou de verdade.
          if (order.status === 'completed') {
            const total = order.total.toNumber();
            if (key === currentMonthKey) revenueThis += total;
            const bucket = totals.get(key);
            if (bucket) {
              bucket.ordersCompleted += 1;
              bucket.revenue += total;
            }
          }
        }

        return { ordersThisMonth: thisMonth, ordersLastMonth: lastMonth, revenueThisMonth: revenueThis, monthlyTotals: totals, userCount: userCountResult };
      });

    const sales: TenantSales = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      ordersThisMonth,
      ordersLastMonth,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      userCount,
      monthlyOrderVolume: monthKeys.map((key) => {
        const bucket = monthlyTotals.get(key) ?? { ordersCompleted: 0, revenue: 0 };
        return {
          month: MONTH_LABELS_PT[Number(key.split('-')[1]) - 1],
          ordersCompleted: bucket.ordersCompleted,
          revenue: Math.round(bucket.revenue * 100) / 100,
        };
      }),
    };

    await this.cache.set(tenantSalesCacheKey(tenantId), sales, TENANT_SALES_CACHE_TTL_SECONDS);
    return sales;
  }
}
