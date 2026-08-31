import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { RequiresModule } from '../module-gate/decorators/requires-module.decorator';
import { ModuleGuard } from '../module-gate/guards/module.guard';
import { TenantTx } from '../prisma/tenant-context.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { RevenueService } from './revenue.service';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('tenant_owner', 'tenant_staff')
@RequiresModule('financeiro')
@Controller('financial/revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get()
  get(@CurrentTenant() tx: TenantTx, @Query() query: RevenueQueryDto) {
    return this.revenueService.getDailyRevenue(tx, query);
  }
}
