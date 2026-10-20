import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
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
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesQueryDto } from './dto/expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

// Mesma ordem de guards ja validada em InventoryController (Sprint 6, primeiro
// consumidor real do ModuleGuard): JwtAuthGuard seta tenantId -> RolesGuard checa papel
// -> ModuleGuard resolve assinatura (propria transacao curta, antes do interceptor) ->
// TenantContextInterceptor abre a transacao real do handler. StaffPermissionGuard
// (Sprint "Equipe", decisao 9) gateia especificamente DESPESAS por "financeiro" --
// RevenueController (receita agregada, usada tambem pelo Dashboard) e' deliberadamente
// NAO gateado por este guard: receita e' so' um agregado de Order.total, dado que
// qualquer funcionario com a permissao "pedidos" ja ve linha a linha no OrdersPanel;
// "financeiro" protege o lado sensivel de verdade (despesas/custos, que combinados com
// receita revelam margem) -- sem essa separacao, Atendente (decisao do usuario: ve
// Dashboard, nao ve Financeiro) perderia o grafico de vendas do proprio Dashboard.
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard, StaffPermissionGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('tenant_owner', 'tenant_staff')
@RequiresModule('financeiro')
@RequiresStaffPermission('financeiro')
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
  list(@CurrentTenant() tx: TenantTx, @Query() query: ExpensesQueryDto) {
    return this.expensesService.list(tx, query);
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
