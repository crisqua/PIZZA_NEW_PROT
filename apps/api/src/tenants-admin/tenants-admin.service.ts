import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { resolveCnpj } from '../common/cnpj.util';
import { tenantBrandingCacheKey } from '../common/tenant-branding-cache-key';
import { toTenantResponse } from '../common/tenant-response.util';
import { SubscriptionSummary, toSubscriptionSummary } from '../common/tenant-subscription-summary.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

@Injectable()
export class TenantsAdminService {
  constructor(
    private readonly prisma: PrismaService,
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
}
