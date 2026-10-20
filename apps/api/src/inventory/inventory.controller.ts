import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { RequiresStaffPermission } from '../common/staff-permission.decorator';
import { StaffPermissionGuard } from '../common/staff-permission.guard';
import { RequiresModule } from '../module-gate/decorators/requires-module.decorator';
import { ModuleGuard } from '../module-gate/guards/module.guard';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryService } from './inventory.service';

// Primeiro consumidor real do ModuleGuard (Sprint 4) -- substitui a rota fixture
// _fixtures/estoque-probe, apagada nesta sprint. Mesma ordem de guards ja validada la:
// JwtAuthGuard seta tenantId -> RolesGuard checa papel -> ModuleGuard resolve assinatura
// (abre sua propria transacao curta, ainda antes do interceptor rodar) ->
// TenantContextInterceptor abre a transacao real do handler. StaffPermissionGuard
// (Sprint "Equipe") entra depois do ModuleGuard -- duplo portao da decisao 9: o tenant
// precisa TER o modulo ("estoque", ModuleGuard) E o funcionario precisa ter a
// permissao ("estoque", StaffPermissionGuard); tenant_owner nunca e' restringido pelo
// segundo.
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard, StaffPermissionGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('tenant_owner', 'tenant_staff')
@RequiresModule('estoque')
@RequiresStaffPermission('estoque')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tx: TenantTx, @Body() dto: CreateInventoryItemDto) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    return this.inventoryService.create(tx, user.tenantId, dto);
  }

  @Get()
  list(@CurrentTenant() tx: TenantTx) {
    return this.inventoryService.list(tx);
  }

  @Get(':id')
  findOne(@CurrentTenant() tx: TenantTx, @Param('id') id: string) {
    return this.inventoryService.findOne(tx, id);
  }

  @Patch(':id')
  update(@CurrentTenant() tx: TenantTx, @Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventoryService.update(tx, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tx: TenantTx, @Param('id') id: string) {
    return this.inventoryService.remove(tx, id);
  }
}
