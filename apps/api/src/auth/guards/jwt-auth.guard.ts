import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestWithTenant } from '../../common/types/request-with-tenant';
import { AuthenticatedUser } from '../types/authenticated-user';

interface AccessTokenPayload {
  sub: string;
  tenantId: string | null;
  role: AuthenticatedUser['role'];
  // Opcional -- tokens emitidos antes da Sprint 15 (perf) nao tem este campo. Ver
  // AuthenticatedUser.email.
  email?: string;
}

// Sem Passport de proposito (mesmo padrao ja validado no Barberaria) — um unico metodo de
// verificacao nao justifica a indirecao de Strategy/PassportModule.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }
    const token = authHeader.slice('Bearer '.length);

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Token de acesso invalido ou expirado.');
    }

    const user: AuthenticatedUser = { id: payload.sub, tenantId: payload.tenantId, role: payload.role, email: payload.email };
    request.user = user;
    // tenant_id extraido SOMENTE do JWT validado (nunca de URL/query/body) — e' o que
    // alimenta o TenantContextInterceptor (Sprint 1) daqui pra frente.
    if (user.tenantId) {
      request.tenantId = user.tenantId;
    }
    return true;
  }
}
