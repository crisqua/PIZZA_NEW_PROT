import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

// Rota de plataforma: SEM TenantContextInterceptor de proposito (opera sobre a plataforma,
// nao um tenant especifico — mesma regra documentada em tenant-context.interceptor.ts).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  @Get('whoami')
  @Roles('platform_superadmin')
  whoami(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
