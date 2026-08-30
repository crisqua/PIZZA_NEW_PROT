import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithTenant } from '../../common/types/request-with-tenant';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../types/authenticated-user';

// Aplicado por controller via @UseGuards(JwtAuthGuard, RolesGuard) — nunca globalmente e
// nunca checagem manual dentro de controller (regra da Sprint 2).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    return !!request.user && requiredRoles.includes(request.user.role);
  }
}
