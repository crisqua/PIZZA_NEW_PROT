import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { toProductResponse } from '../common/product-response.util';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

const CATALOG_CACHE_TTL_SECONDS = 60;

function catalogCacheKey(slug: string): string {
  return `catalog:public:${slug}`;
}

// Espelha tenants-public/tenants-public.controller.ts na forma (sem @UseGuards -- rota
// publica, cliente final navega o cardapio antes de logar/cadastrar). Diferenca: aqui os
// dados TEM RLS (categories/products), entao nao da' pra so' ler direto do PrismaService
// como tenants-public faz com o proprio Tenant (que nao tem RLS) -- precisa abrir a
// propria transacao de tenant via TenantContextService depois de resolver o slug.
// Cache so' com TTL curto (60s), sem invalidacao ativa -- mesmo padrao ja usado pra
// branding em tenants-public; staff ver o proprio menu com ate' 60s de atraso apos editar
// um produto e' aceitavel no MVP.
@Controller('public/tenants/:slug/catalog')
export class CatalogPublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  async findCatalog(@Param('slug') slug: string) {
    const key = catalogCacheKey(slug);
    const cached = await this.cache.get<{ categories: unknown[]; products: unknown[] }>(key);
    if (cached) {
      return cached;
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || !tenant.active) {
      throw new NotFoundException();
    }

    const [categories, products] = await this.tenantContext.runInTenantContext(tenant.id, (tx) =>
      Promise.all([
        tx.category.findMany({ orderBy: { createdAt: 'asc' } }),
        tx.product.findMany({ where: { available: true }, orderBy: { createdAt: 'asc' } }),
      ]),
    );

    const result = { categories, products: products.map(toProductResponse) };
    await this.cache.set(key, result, CATALOG_CACHE_TTL_SECONDS);
    return result;
  }
}
