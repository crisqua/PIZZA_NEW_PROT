import { Body, Controller, ForbiddenException, Get, NotFoundException, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CacheService } from '../cache/cache.service';
import { tenantBrandingCacheKey } from '../common/tenant-branding-cache-key';
import { toTenantResponse } from '../common/tenant-response.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';

// "tenants" nao tem RLS -- sem TenantContextInterceptor. Isolamento aqui e' 100%
// "where: { id: user.tenantId }" vindo do JWT, nunca de param/body (a rota nem tem :id).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_owner', 'tenant_staff')
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const tenant = await this.findOwnTenant(user);
    // "active" e' incluido de proposito (nao e' segredo pro proprio dono/staff -- ver
    // plano da Sprint 3): sem isso um tenant desativado nao teria como saber o motivo do
    // login parar de funcionar, ja que o token de acesso continua valido ate expirar.
    return toTenantResponse(tenant);
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateTenantBrandingDto) {
    const tenant = await this.findOwnTenant(user);
    const updated = await this.prisma.tenant.update({ where: { id: tenant.id }, data: { ...dto } });
    // slug e' imutavel nesta rota -- so' uma chave pra invalidar.
    await this.cache.del(tenantBrandingCacheKey(updated.slug));
    return toTenantResponse(updated);
  }

  private async findOwnTenant(user: AuthenticatedUser) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) {
      throw new NotFoundException();
    }
    return tenant;
  }
}
