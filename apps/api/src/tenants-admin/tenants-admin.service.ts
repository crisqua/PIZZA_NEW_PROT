import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { tenantBrandingCacheKey } from '../common/tenant-branding-cache-key';
import { toTenantResponse } from '../common/tenant-response.util';
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
    try {
      // active nunca vem do body -- toda pizzaria nasce ativa, so' o toggle dedicado
      // desativa. Nada a invalidar no cache: slug novo, a chave nunca existiu.
      const tenant = await this.prisma.tenant.create({ data: { ...dto } });
      return toTenantResponse(tenant);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Slug ja esta em uso.');
      }
      throw err;
    }
  }

  async list(page: number, pageSize: number): Promise<Paginated<ReturnType<typeof toTenantResponse>>> {
    const [rows, total] = await Promise.all([
      this.prisma.tenant.findMany({
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tenant.count(),
    ]);
    return { items: rows.map(toTenantResponse), total, page, pageSize };
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

    try {
      const updated = await this.prisma.tenant.update({ where: { id }, data: { ...dto } });

      // Se o slug mudou, invalida a chave ANTIGA (a nova nunca existiu no cache ainda).
      if (dto.slug && dto.slug !== existing.slug) {
        await this.cache.del(tenantBrandingCacheKey(existing.slug));
      }
      await this.cache.del(tenantBrandingCacheKey(updated.slug));

      return toTenantResponse(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Slug ja esta em uso.');
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
