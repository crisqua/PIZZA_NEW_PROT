import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';

// Rota de plataforma: SEM TenantContextInterceptor de proposito (opera sobre a
// plataforma inteira, nao um tenant especifico -- mesma regra de admin.controller.ts).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @Roles('platform_superadmin')
  list(@Query() query: ListAdminUsersQueryDto) {
    return this.service.list(query);
  }
}
