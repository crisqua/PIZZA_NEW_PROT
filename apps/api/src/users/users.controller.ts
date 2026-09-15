import {
  Body,
  Controller,
  ForbiddenException,
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
import { CepLookupService } from '../common/cep-lookup.service';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantContextService, TenantTx } from '../prisma/tenant-context.service';
import { UpdateMeDto } from './dto/update-me.dto';

// Nunca selecionar passwordHash pra fora do banco — nem pra dentro do processo sem
// necessidade, ja que a resposta HTTP serializa qualquer campo presente no objeto.
const PUBLIC_USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  address: true,
  addressNumber: true,
  complement: true,
  neighborhood: true,
  cep: true,
  city: true,
  state: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Base real do futuro modulo de usuarios (nao e' descartavel) — nasceu aqui na Sprint 2 so
// pra dar uma rota autenticada real pros testes de IDOR/override de tenant_id do DoD.
//
// TenantContextInterceptor NAO e' mais class-level (Sprint 12): ele abre a transacao
// ANTES do handler rodar e so' a fecha depois que o handler inteiro resolve -- certo pra
// "me"/"findOne" (so' leem o banco), mas errado pra "updateMe" quando o body tem "cep":
// CepLookupService faz uma chamada de rede de verdade (ate 3s), e segurar uma transacao
// Prisma aberta por uma chamada HTTP externa lenta esgota o timeout dela e derruba a
// requisicao com "Transaction not found" (bug real, confirmado via smoke test manual em
// OrdersService antes desta mesma correcao ser replicada aqui). updateMe agora resolve o
// CEP fora de qualquer transacao e so' abre uma (curta, manual) pro update em si.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly cepLookup: CepLookupService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('me')
  @Roles('tenant_owner', 'tenant_staff', 'customer')
  @UseInterceptors(TenantContextInterceptor)
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
  @UseInterceptors(TenantContextInterceptor)
  async findOne(@Param('id') id: string, @CurrentTenant() tx: TenantTx) {
    const found = await tx.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!found) {
      throw new NotFoundException();
    }
    return found;
  }

  // whitelist:true + forbidNonWhitelisted:true (global, ver bootstrap.ts) rejeita com 400
  // qualquer campo extra no body (ex. tenantId/tenant_id) antes do handler rodar — essa e'
  // a prova real de que manipular tenant_id no body nao tem efeito. Sem
  // TenantContextInterceptor aqui (ver comentario da classe) -- abre a propria transacao
  // manualmente, depois de resolver o CEP.
  @Patch('me')
  @Roles('tenant_owner', 'tenant_staff', 'customer')
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    const data: UpdateMeDto = { ...dto };
    // Mesma dupla checagem do checkout (Sprint 12): quando o perfil e' editado com um
    // CEP, o backend consulta o ViaCEP de novo e vira a fonte da verdade pra
    // address/neighborhood/city/state -- reforca a decisao de que o endereco salvo no
    // perfil passa pela mesma validacao do checkout.
    if (dto.cep) {
      const result = await this.cepLookup.resolve(dto.cep);
      if (result) {
        data.address = result.address;
        data.neighborhood = result.neighborhood;
        data.city = result.city;
        data.state = result.state;
      }
    }
    return this.tenantContext.runInTenantContext(user.tenantId, (tx) =>
      tx.user.update({ where: { id: user.id }, data, select: PUBLIC_USER_SELECT }),
    );
  }
}
