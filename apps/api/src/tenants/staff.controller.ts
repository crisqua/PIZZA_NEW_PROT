import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

// Decisao 1 (Sprint "Equipe") -- so' tenant_owner gerencia a Equipe, @Roles na classe
// inteira: tenant_staff recebe 403 em qualquer rota aqui, nunca cadastra/edita outro
// funcionario nem a si mesmo. Rotas fixas ("contract-types"/"positions") precisam vir
// ANTES de ":id" na ordem de declaracao (Nest casa por ordem, mesmo cuidado ja' tomado
// em OrdersController com "top-products").
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('tenant_owner')
@Controller('tenants/me/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('contract-types')
  contractTypes(@CurrentTenant() tx: TenantTx) {
    return this.staffService.getContractTypes(tx);
  }

  @Get('positions')
  positions(@CurrentTenant() tx: TenantTx) {
    return this.staffService.getPositions(tx);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tx: TenantTx, @Body() dto: CreateStaffDto) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    return this.staffService.create(tx, user.tenantId, user, dto);
  }

  @Get()
  list(@CurrentTenant() tx: TenantTx) {
    return this.staffService.list(tx);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tx: TenantTx,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    return this.staffService.update(tx, user.tenantId, user, id, dto);
  }
}
