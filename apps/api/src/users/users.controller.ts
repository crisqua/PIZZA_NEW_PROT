import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
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
import { UpdateMeDto } from './dto/update-me.dto';

// Nunca selecionar passwordHash pra fora do banco — nem pra dentro do processo sem
// necessidade, ja que a resposta HTTP serializa qualquer campo presente no objeto.
const PUBLIC_USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Base real do futuro modulo de usuarios (nao e' descartavel) — nasceu aqui na Sprint 2 so
// pra dar uma rota autenticada real pros testes de IDOR/override de tenant_id do DoD.
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Controller('users')
export class UsersController {
  @Get('me')
  @Roles('tenant_owner', 'tenant_staff', 'customer')
  async me(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tx: TenantTx) {
    const found = await tx.user.findUnique({ where: { id: user.id }, select: PUBLIC_USER_SELECT });
    if (!found) {
      throw new NotFoundException();
    }
    return found;
  }

  // RLS faz um id de outro tenant "sumir" (findUnique retorna null) — 404, nunca 403, pra
  // nao confirmar que o recurso existe (mesmo padrao do teste de IDOR do Barberaria).
  @Get(':id')
  @Roles('tenant_owner', 'tenant_staff', 'customer')
  async findOne(@Param('id') id: string, @CurrentTenant() tx: TenantTx) {
    const found = await tx.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!found) {
      throw new NotFoundException();
    }
    return found;
  }

  // whitelist:true + forbidNonWhitelisted:true (global, ver bootstrap.ts) rejeita com 400
  // qualquer campo extra no body (ex. tenantId/tenant_id) antes do handler rodar — essa e'
  // a prova real de que manipular tenant_id no body nao tem efeito.
  @Patch('me')
  @Roles('tenant_owner', 'tenant_staff', 'customer')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tx: TenantTx,
    @Body() dto: UpdateMeDto,
  ) {
    return tx.user.update({ where: { id: user.id }, data: dto, select: PUBLIC_USER_SELECT });
  }
}
