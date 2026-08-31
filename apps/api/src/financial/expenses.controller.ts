import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { RequiresModule } from '../module-gate/decorators/requires-module.decorator';
import { ModuleGuard } from '../module-gate/guards/module.guard';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

// Mesma ordem de guards ja validada em InventoryController (Sprint 6, primeiro
// consumidor real do ModuleGuard): JwtAuthGuard seta tenantId -> RolesGuard checa papel
// -> ModuleGuard resolve assinatura (propria transacao curta, antes do interceptor) ->
// TenantContextInterceptor abre a transacao real do handler.
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('tenant_owner', 'tenant_staff')
@RequiresModule('financeiro')
@Controller('financial/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tx: TenantTx, @Body() dto: CreateExpenseDto) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    return this.expensesService.create(tx, user.tenantId, dto);
  }

  @Get()
  list(@CurrentTenant() tx: TenantTx) {
    return this.expensesService.list(tx);
  }

  @Get(':id')
  findOne(@CurrentTenant() tx: TenantTx, @Param('id') id: string) {
    return this.expensesService.findOne(tx, id);
  }

  @Patch(':id')
  update(@CurrentTenant() tx: TenantTx, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(tx, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tx: TenantTx, @Param('id') id: string) {
    return this.expensesService.remove(tx, id);
  }
}
