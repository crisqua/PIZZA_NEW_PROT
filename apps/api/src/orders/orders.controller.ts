import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

// Sem ModuleGuard de proposito -- pedido e' feature core (nao add-on pago), diferente de
// InventoryController.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // SEM @UseInterceptors(TenantContextInterceptor) aqui de proposito, diferente de
  // list/findOne/updateStatus abaixo: OrdersService.create abre as PROPRIAS transacoes
  // (ver comentario la') porque uma corrida de idempotencia precisa de uma segunda
  // transacao apos a primeira abortar -- usar o "tx" unico do interceptor nao permitiria
  // isso (Postgres aborta a transacao inteira apos qualquer erro).
  @Post()
  @Roles('customer')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    if (!idempotencyKey) {
      throw new BadRequestException('Header Idempotency-Key e obrigatorio.');
    }
    return this.ordersService.create(user.tenantId, user.id, idempotencyKey, dto);
  }

  @Get()
  @Roles('customer', 'tenant_owner', 'tenant_staff')
  @UseInterceptors(TenantContextInterceptor)
  list(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tx: TenantTx) {
    return this.ordersService.list(tx, user);
  }

  @Get(':id')
  @Roles('customer', 'tenant_owner', 'tenant_staff')
  @UseInterceptors(TenantContextInterceptor)
  findOne(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tx: TenantTx, @Param('id') id: string) {
    return this.ordersService.findOne(tx, user, id);
  }

  @Patch(':id/status')
  @Roles('tenant_owner', 'tenant_staff')
  @UseInterceptors(TenantContextInterceptor)
  updateStatus(@CurrentTenant() tx: TenantTx, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(tx, id, dto.status);
  }
}
