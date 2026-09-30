import { tenantThrottlerTracker } from './tenant-throttler-tracker';
import { RequestWithTenant } from './types/request-with-tenant';

describe('tenantThrottlerTracker', () => {
  it('usa o tenantId do usuario autenticado quando presente', async () => {
    const req = { user: { id: 'u1', tenantId: 'tenant-1', role: 'customer' }, ip: '1.2.3.4' } as RequestWithTenant;
    await expect(tenantThrottlerTracker(req)).resolves.toBe('tenant-1');
  });

  it('cai pro IP quando nao ha usuario autenticado', async () => {
    const req = { ip: '1.2.3.4' } as RequestWithTenant;
    await expect(tenantThrottlerTracker(req)).resolves.toBe('1.2.3.4');
  });

  it('cai pro IP quando o usuario e platform_superadmin (tenantId null)', async () => {
    const req = { user: { id: 'u1', tenantId: null, role: 'platform_superadmin' }, ip: '1.2.3.4' } as RequestWithTenant;
    await expect(tenantThrottlerTracker(req)).resolves.toBe('1.2.3.4');
  });

  it('nunca quebra mesmo sem usuario nem IP', async () => {
    const req = {} as RequestWithTenant;
    await expect(tenantThrottlerTracker(req)).resolves.toBe('unknown');
  });
});
