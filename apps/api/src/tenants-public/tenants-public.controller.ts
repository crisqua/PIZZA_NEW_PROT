import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { TENANT_BRANDING_CACHE_TTL_SECONDS, tenantBrandingCacheKey } from '../common/tenant-branding-cache-key';
import { toTenantBrandingResponse, TenantBrandingResponse } from '../common/tenant-response.util';
import { PrismaService } from '../prisma/prisma.service';

// Sem @UseGuards nenhum de proposito -- rota publica, resolve branding antes do login (a
// cliente final precisa pintar cor/logo do menu sem estar autenticada ainda). E' essa a
// leitura de alto volume que justifica o cache Redis (as outras 2 rotas de tenants sao de
// baixo trafego: superadmin e painel logado).
@Controller('public/tenants')
export class TenantsPublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string): Promise<TenantBrandingResponse> {
    const key = tenantBrandingCacheKey(slug);
    const cached = await this.cache.get<TenantBrandingResponse>(key);
    if (cached) {
      return cached;
    }

    // select explicito, nao "tenant completo com campos removidos depois" -- garante que
    // um campo interno novo nunca vaza por esquecimento nesta rota publica.
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { name: true, slug: true, primaryColor: true, logo: true },
    });
    if (!tenant) {
      throw new NotFoundException();
    }

    const branding = toTenantBrandingResponse(tenant);
    await this.cache.set(key, branding, TENANT_BRANDING_CACHE_TTL_SECONDS);
    return branding;
  }
}
