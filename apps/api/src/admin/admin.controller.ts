import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

// Rota de plataforma: SEM TenantContextInterceptor de proposito (opera sobre a plataforma,
// nao um tenant especifico — mesma regra documentada em tenant-context.interceptor.ts).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('whoami')
  @Roles('platform_superadmin')
  whoami(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // "orders" tem RLS FORCADA -- a role de banco da aplicacao (pizza_app, NOSUPERUSER
  // NOBYPASSRLS) nunca pode ler entre tenants numa query so', nem pra um dashboard de
  // plataforma. Unica forma correta de agregar "pedidos do mes" entre TODOS os tenants e'
  // iterar tenant por tenant (runInTenantContext) e somar -- aceitavel na escala de
  // MVP/piloto (poucos tenants), revisitar so' se o numero de tenants crescer muito.
  @Get('dashboard')
  @Roles('platform_superadmin')
  async dashboard() {
    const [tenantCount, tenants] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.findMany({ select: { id: true } }),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const counts = await Promise.all(
      tenants.map((tenant) =>
        this.tenantContext.runInTenantContext(tenant.id, (tx) =>
          tx.order.count({ where: { createdAt: { gte: startOfMonth } } }),
        ),
      ),
    );
    const ordersThisMonth = counts.reduce((sum, count) => sum + count, 0);

    return { tenantCount, ordersThisMonth };
  }
}
