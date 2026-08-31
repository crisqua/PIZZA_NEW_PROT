import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsAdminService } from './subscriptions-admin.service';

// Modulo separado de tenants-admin de proposito: TenantsAdminService so' usa
// PrismaService (nada de RLS na cadeia); aqui precisa de TenantContextService, ja que
// "subscriptions" tem RLS de verdade. Path explicito (nao @Controller('admin/tenants')
// prefixado) porque so' sao 2 rotas, nao um CRUD completo.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform_superadmin')
@Controller()
export class SubscriptionsAdminController {
  constructor(private readonly subscriptionsAdminService: SubscriptionsAdminService) {}

  @Get('admin/tenants/:tenantId/subscription')
  findForTenant(@Param('tenantId') tenantId: string) {
    return this.subscriptionsAdminService.findForTenant(tenantId);
  }

  @Patch('admin/tenants/:tenantId/subscription')
  upsertForTenant(@Param('tenantId') tenantId: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsAdminService.upsertForTenant(tenantId, dto);
  }
}
