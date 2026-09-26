import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CacheService } from '../../src/cache/cache.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupSuperAdmin, seedSuperAdmin, SeededSuperAdmin } from '../utils/seed-auth-fixtures';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupPlan, cleanupSubscription, seedPlan, seedSubscription, SeededPlan } from '../utils/seed-subscription';

// Sprint "Mudanca de Dashboard" (2026-09-26): este endpoint deixou de agregar
// pedidos/usuarios de todos os tenants (removido -- nao era util no dia a dia, decisao
// do usuario; ver TenantsAdminService.getSales pro equivalente por-pizzaria, testado em
// tenant-sales.e2e-spec.ts). O que sobra aqui (mrr/plansDistribution/contagem
// aberta-fechada) e' O(1) desde as Sprints 22/27 -- nunca abre transacao de tenant.
describe('GET /v1/admin/dashboard', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let cache: CacheService;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;
  let tenant: SeededTenantUser;
  let plan: SeededPlan;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);
    cache = app.get(CacheService);

    superAdmin = await seedSuperAdmin(prisma);
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password })
      .expect(200);
    superAdminToken = loginRes.body.accessToken;

    tenant = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'dash', role: 'tenant_owner' });
    plan = await seedPlan(prisma, { price: 99 });
    await seedSubscription(prisma, tenantContext, tenant.tenantId, plan.id);
  });

  afterAll(async () => {
    await cleanupSubscription(tenantContext, tenant.tenantId);
    await cleanupTenantWithUser(prisma, tenantContext, tenant);
    await cleanupPlan(prisma, plan);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('retorna contagem de tenants', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.tenantCount).toBeGreaterThanOrEqual(1);
  });

  it('mrr soma o preco do plano de assinaturas ativas', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.mrr).toBeGreaterThanOrEqual(99);
    const planRow = res.body.plansDistribution.find((p: { planCode: string }) => p.planCode === plan.code);
    expect(planRow).toEqual({ planCode: plan.code, planName: plan.code, tenantCount: 1 });
  });

  it('openTenantCount/closedTenantCount refletem Tenant.isOpen (Sprint 27, dado ja carregado, sem consulta nova)', async () => {
    // Dashboard e' cacheado (TTL curto, sem invalidacao ativa) -- os testes anteriores
    // desta suite ja' esquentaram o cache antes de eu mudar isOpen aqui, entao preciso
    // limpar a chave manualmente pra nao ler um resultado obsoleto (mesma chave
    // hard-coded de admin-dashboard.service.ts, nao exportada).
    await cache.del('admin:dashboard');
    await prisma.tenant.update({ where: { id: tenant.tenantId }, data: { isOpen: false } });
    try {
      const res = await request(app.getHttpServer())
        .get('/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.closedTenantCount).toBeGreaterThanOrEqual(1);
      expect(res.body.openTenantCount + res.body.closedTenantCount).toBe(res.body.tenantCount);
    } finally {
      await prisma.tenant.update({ where: { id: tenant.tenantId }, data: { isOpen: true } });
      await cache.del('admin:dashboard');
    }
  });

  it('nao-superadmin recebe 403; sem token 401', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenant.email, password: tenant.password, tenantSlug: tenant.tenantSlug })
      .expect(200);
    await request(app.getHttpServer())
      .get('/v1/admin/dashboard')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(403);
    await request(app.getHttpServer()).get('/v1/admin/dashboard').expect(401);
  });
});
