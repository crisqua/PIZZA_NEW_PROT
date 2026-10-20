import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffPermission } from '../tenants/staff-permissions';
import { RequestWithTenant } from './types/request-with-tenant';
import { STAFF_PERMISSION_KEY } from './staff-permission.decorator';

// Sprint "Equipe" (decisao 9) -- mesma estrutura de RolesGuard (SetMetadata +
// Reflector), mas resolvendo um problema diferente: RolesGuard decide "esse PAPEL pode
// chamar esta rota" (tenant_owner/tenant_staff/customer/platform_superadmin); este guard
// decide "esse FUNCIONARIO especifico, dentro do papel tenant_staff, tem a area
// liberada" -- um cargo customizado ("Gerente") pode ter Financeiro, outro
// ("Atendente") pode nao ter, mesmo sendo os dois tenant_staff.
//
// tenant_owner/platform_superadmin NUNCA sao restringidos por este guard -- so' existe
// pra tenant_staff. Le "permissions" direto do JWT (via request.user, populado pelo
// JwtAuthGuard), sem ida ao banco -- mesmo raciocinio de performance do "email" no JWT
// (Sprint 15): os controllers gateados por isto (Pedidos/Cardapio/Estoque/Financeiro)
// sao os mais chamados do sistema, uma consulta extra por requisicao aqui teria custo
// real no Render Free. Staleness aceita: ate 15min (vida do access token) -- ver
// AuthService.refresh(), que relê o banco pra role:'tenant_staff' especificamente.
@Injectable()
export class StaffPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<StaffPermission | undefined>(STAFF_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const user = request.user;
    if (!user || user.role !== 'tenant_staff') {
      // tenant_owner (e qualquer outro papel que eventualmente chegue aqui, ex.
      // customer em rotas compartilhadas como GET /orders) nunca e' restringido --
      // RolesGuard ja' decidiu se o papel pode chamar a rota, este guard so' refina
      // DENTRO de tenant_staff.
      return true;
    }

    if (!(user.permissions ?? []).includes(required)) {
      throw new ForbiddenException('Funcionario sem acesso a este modulo.');
    }
    return true;
  }
}
