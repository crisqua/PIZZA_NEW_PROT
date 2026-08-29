import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { from, lastValueFrom, Observable } from 'rxjs';
import { TenantContextService } from '../../prisma/tenant-context.service';

/**
 * Aplicar em toda rota tenant-scoped (nunca nas rotas /admin/* da plataforma).
 * Espera `request.tenantId` ja populado por um guard de auth anterior no pipeline
 * (JwtAuthGuard, Sprint 2) — esta sprint ainda nao tem esse guard, entao nenhum
 * controller usa este interceptor ainda; ele existe e e exportado pra Sprint 2 consumir.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException(
        'tenant_id ausente no contexto da requisicao — rota precisa de um AuthGuard antes deste interceptor.',
      );
    }

    return from(
      this.tenantContext.runInTenantContext(tenantId, async (tx) => {
        request.tenantTx = tx;
        return lastValueFrom(next.handle());
      }),
    );
  }
}
