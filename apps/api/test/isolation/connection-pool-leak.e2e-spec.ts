import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { seedTenant, SeededTenant } from '../utils/seed-tenant';

// Teste mais critico da Sprint 1 (docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md secao 3.2 item 6):
// prova que, mesmo disparando muitas transacoes concorrentes que reaproveitam conexoes do
// pool do Prisma, o SET LOCAL (set_config(..., true)) nunca vaza tenant_id de uma
// transacao pra outra.
describe('Secao 3.2 item 6 — vazamento de contexto sob connection pooling', () => {
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantA: SeededTenant;
  let tenantB: SeededTenant;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    tenantContext = new TenantContextService(prisma);
    tenantA = await seedTenant(prisma, tenantContext, 'pool-a');
    tenantB = await seedTenant(prisma, tenantContext, 'pool-b');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('nenhuma das requisicoes concorrentes ve dado de outro tenant', async () => {
    const iterations = 40;
    const calls = Array.from({ length: iterations }, (_, i) => {
      const tenant = i % 2 === 0 ? tenantA : tenantB;
      return tenantContext.runInTenantContext(tenant.tenantId, async (tx) => {
        const users = await tx.user.findMany();
        return { expectedTenantId: tenant.tenantId, users };
      });
    });

    const results = await Promise.all(calls);

    for (const { expectedTenantId, users } of results) {
      expect(users.length).toBeGreaterThan(0);
      expect(users.every((u) => u.tenantId === expectedTenantId)).toBe(true);
    }
  });
});
