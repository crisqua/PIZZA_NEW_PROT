import { Body, Controller, ForbiddenException, Get, NotFoundException, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CacheService } from '../cache/cache.service';
import { tenantBrandingCacheKey } from '../common/tenant-branding-cache-key';
import { toTenantResponse } from '../common/tenant-response.util';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { TenantTx } from '../prisma/tenant-context.service';
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

  // "subscriptions" TEM RLS de verdade (diferente de "tenants") -- so' este handler
  // precisa do TenantContextInterceptor/@CurrentTenant(), mesmo padrao de guard por
  // metodo ja usado em OrdersController (Sprint 7). Sem assinatura nenhuma retorna 200
  // com modules:[] (nao 404) -- "tenant sem plano ainda" e' um estado normal do dono
  // verificar, nao um erro. Existe pra fechar um gap real: ate a Sprint 8, nenhum
  // tenant_owner/tenant_staff tinha como saber os modulos do proprio plano sem tentar
  // uma rota gateada por ModuleGuard e capturar o 403.
  @Get('me/subscription')
  @UseInterceptors(TenantContextInterceptor)
  async getMySubscription(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tx: TenantTx) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    const subscription = await tx.subscription.findUnique({
      where: { tenantId: user.tenantId },
      include: { plan: true },
    });
    if (!subscription) {
      return { status: null, planCode: null, planName: null, modules: [] };
    }
    return {
      status: subscription.status,
      planCode: subscription.plan.code,
      planName: subscription.plan.name,
      modules: subscription.plan.modules,
    };
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
