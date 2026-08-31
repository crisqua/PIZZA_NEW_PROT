import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../../cache/cache.service';
import { TenantContextService } from '../../prisma/tenant-context.service';
import { ModuleGuard } from './module.guard';

function mockContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('ModuleGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let cache: jest.Mocked<CacheService>;
  let guard: ModuleGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    tenantContext = { runInTenantContext: jest.fn() } as unknown as jest.Mocked<TenantContextService>;
    cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() } as unknown as jest.Mocked<CacheService>;
    guard = new ModuleGuard(reflector, tenantContext, cache);
  });

  it('sem metadata (@RequiresModule ausente) permite direto, sem tocar em cache/banco', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(mockContext({}))).resolves.toBe(true);
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('sem tenantId no request (ex.: platform_superadmin) da 403', async () => {
    reflector.getAllAndOverride.mockReturnValue(['estoque']);
    await expect(guard.canActivate(mockContext({}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('tenant sem assinatura nenhuma da 403', async () => {
    reflector.getAllAndOverride.mockReturnValue(['estoque']);
    cache.get.mockResolvedValue(null);
    tenantContext.runInTenantContext.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext({ tenantId: 't1' }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(cache.set).toHaveBeenCalledWith('subscription:tenant:t1', { found: false }, 60);
  });

  it('assinatura cancelada da 403 mesmo se o plano incluir o modulo', async () => {
    reflector.getAllAndOverride.mockReturnValue(['estoque']);
    cache.get.mockResolvedValue(null);
    tenantContext.runInTenantContext.mockResolvedValue({
      status: 'cancelled',
      plan: { modules: ['estoque'] },
    } as never);

    await expect(guard.canActivate(mockContext({ tenantId: 't1' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('modulo pedido ausente no plano da 403', async () => {
    reflector.getAllAndOverride.mockReturnValue(['financeiro']);
    cache.get.mockResolvedValue(null);
    tenantContext.runInTenantContext.mockResolvedValue({
      status: 'active',
      plan: { modules: ['estoque'] },
    } as never);

    await expect(guard.canActivate(mockContext({ tenantId: 't1' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assinatura ativa com o modulo incluso permite (200)', async () => {
    reflector.getAllAndOverride.mockReturnValue(['estoque']);
    cache.get.mockResolvedValue(null);
    tenantContext.runInTenantContext.mockResolvedValue({
      status: 'active',
      plan: { modules: ['estoque', 'financeiro'] },
    } as never);

    await expect(guard.canActivate(mockContext({ tenantId: 't1' }))).resolves.toBe(true);
  });

  it('cache hit pula runInTenantContext inteiramente', async () => {
    reflector.getAllAndOverride.mockReturnValue(['estoque']);
    cache.get.mockResolvedValue({ found: true, status: 'active', modules: ['estoque'] });

    await expect(guard.canActivate(mockContext({ tenantId: 't1' }))).resolves.toBe(true);
    expect(tenantContext.runInTenantContext).not.toHaveBeenCalled();
  });
});
