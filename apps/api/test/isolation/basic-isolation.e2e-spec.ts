import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { seedTenant, SeededTenant } from '../utils/seed-tenant';

describe('Secao 3.2 item 1 — isolamento basico entre tenants', () => {
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantA: SeededTenant;
  let tenantB: SeededTenant;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    tenantContext = new TenantContextService(prisma);
    tenantA = await seedTenant(prisma, tenantContext, 'basic-a');
    tenantB = await seedTenant(prisma, tenantContext, 'basic-b');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('tenant A so enxerga usuarios do proprio tenant', async () => {
    const users = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.user.findMany(),
    );
    expect(users.length).toBeGreaterThan(0);
    expect(users.every((u) => u.tenantId === tenantA.tenantId)).toBe(true);
  });

  it('tenant B so enxerga usuarios do proprio tenant', async () => {
    const users = await tenantContext.runInTenantContext(tenantB.tenantId, (tx) =>
      tx.user.findMany(),
    );
    expect(users.length).toBeGreaterThan(0);
    expect(users.every((u) => u.tenantId === tenantB.tenantId)).toBe(true);
  });

  it('buscar por id de usuario de outro tenant, dentro do proprio contexto, retorna vazio', async () => {
    const attempt = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.user.findUnique({ where: { id: tenantB.userId } }),
    );
    expect(attempt).toBeNull();
  });
});
