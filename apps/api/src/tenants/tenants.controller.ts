import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CacheService } from '../cache/cache.service';
import { resolveCnpj } from '../common/cnpj.util';
import { resolveActorEmail } from '../common/resolve-actor-email.util';
import { tenantBrandingCacheKey } from '../common/tenant-branding-cache-key';
import { toTenantResponse } from '../common/tenant-response.util';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService, TenantTx } from '../prisma/tenant-context.service';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

// "tenants" nao tem RLS -- sem TenantContextInterceptor. Isolamento aqui e' 100%
// "where: { id: user.tenantId }" vindo do JWT, nunca de param/body (a rota nem tem :id).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_owner', 'tenant_staff')
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
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
    const cnpj = resolveCnpj(dto.cnpj);
    try {
      const updated = await this.prisma.tenant.update({ where: { id: tenant.id }, data: { ...dto, cnpj } });
      // slug e' imutavel nesta rota -- so' uma chave pra invalidar.
      await this.cache.del(tenantBrandingCacheKey(updated.slug));
      // Sprint 15 -- so' loga quando "isOpen" veio no body E mudou de verdade (nao
      // registra um PATCH que so' mexeu em outro campo, ex. deliveryFee, sem tocar
      // isOpen -- evitaria log "fantasma" pra mudancas que nao tem nada a ver com o
      // estado da loja). "tenants" nao tem RLS, mas "audit_logs" tem -- precisa do
      // proprio runInTenantContext so' pra essa escrita, nao e' uma transacao de
      // negocio formal com o update acima (que ja aconteceu e ja teve sucesso).
      if (dto.isOpen !== undefined && dto.isOpen !== tenant.isOpen) {
        await this.tenantContext.runInTenantContext(tenant.id, async (tx) => {
          await this.auditLog.record(tx, {
            tenantId: tenant.id,
            actorId: user.id,
            actorEmail: await resolveActorEmail(tx, user.id),
            actorRole: user.role,
            action: 'tenant.store_status_change',
            targetType: 'tenant',
            targetId: tenant.id,
            metadata: { from: tenant.isOpen, to: updated.isOpen },
          });
        });
      }
      return toTenantResponse(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('CNPJ ja cadastrado.');
      }
      throw err;
    }
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
