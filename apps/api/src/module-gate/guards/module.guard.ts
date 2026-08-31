import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../../cache/cache.service';
import { subscriptionCacheKey, SUBSCRIPTION_CACHE_TTL_SECONDS } from '../../common/subscription-cache-key';
import { RequestWithTenant } from '../../common/types/request-with-tenant';
import { TenantContextService } from '../../prisma/tenant-context.service';
import { MODULES_KEY } from '../decorators/requires-module.decorator';
import { ModuleCode } from '../types/module-code';

// Cacheia um wrapper, nunca um null cru: CacheService.get() retorna null tanto pra "nao
// esta no cache" quanto representaria "tenant sem assinatura" -- sem o wrapper, "sem
// assinatura" nunca ficaria de fato cacheado (todo hit pareceria miss).
interface SubscriptionGateEntry {
  found: boolean;
  status?: string;
  modules?: string[];
}

// Sem precedente no Barberaria (ele nunca teve modulo pago pra travar) -- desenhado do
// zero, seguindo a estrutura de RolesGuard (SetMetadata + Reflector) mas resolvendo um
// problema que RolesGuard nao tem: precisa de acesso a banco (Subscription tem RLS).
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
    private readonly cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<ModuleCode[] | undefined>(MODULES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const tenantId = request.tenantId;
    if (!tenantId) {
      // Rota com @RequiresModule e' inerentemente tenant-scoped; um platform_superadmin
      // (tenantId null no JWT) nao tem contexto de assinatura nenhum.
      throw new ForbiddenException('Rota exige um tenant com assinatura.');
    }

    const entry = await this.resolveEntry(tenantId);

    if (!entry.found) {
      throw new ForbiddenException('Tenant sem assinatura.');
    }
    if (entry.status !== 'active') {
      throw new ForbiddenException('Assinatura cancelada.');
    }
    if (!required.every((m) => entry.modules!.includes(m))) {
      throw new ForbiddenException('Modulo nao incluso no plano.');
    }
    return true;
  }

  private async resolveEntry(tenantId: string): Promise<SubscriptionGateEntry> {
    const key = subscriptionCacheKey(tenantId);
    const cached = await this.cache.get<SubscriptionGateEntry>(key);
    if (cached) {
      return cached;
    }

    // @CurrentTenant() nao existe ainda aqui -- guards rodam ANTES de interceptors no
    // pipeline do Nest (Guards -> Interceptors -> Handler), entao a transacao do
    // TenantContextInterceptor so' abre depois deste guard terminar. Abre a PROPRIA
    // transacao, curta, inevitavel dado o ordenamento (nao e' atalho, e' a unica forma
    // correta de ler uma tabela com RLS durante canActivate()).
    const subscription = await this.tenantContext.runInTenantContext(tenantId, (tx) =>
      tx.subscription.findUnique({ where: { tenantId }, include: { plan: true } }),
    );

    const entry: SubscriptionGateEntry = subscription
      ? { found: true, status: subscription.status, modules: subscription.plan.modules as string[] }
      : { found: false };

    await this.cache.set(key, entry, SUBSCRIPTION_CACHE_TTL_SECONDS);
    return entry;
  }
}
