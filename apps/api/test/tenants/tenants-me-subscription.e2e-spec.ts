import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupPlan, cleanupSubscription, seedPlan, seedSubscription, SeededPlan } from '../utils/seed-subscription';

// Fecha um gap real (Sprint 9): ate' aqui nenhum tenant_owner/tenant_staff tinha como
// saber os modulos do proprio plano sem tentar uma rota gateada por ModuleGuard e
// capturar o 403 -- apps/pizzaria precisa disso pra saber se mostra Estoque/Financeiro
// liberados ou bloqueados.
describe('GET /v1/tenants/me/subscription', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let plan: SeededPlan;
  let tenantWithPlan: SeededTenantUser;
  let tenantNoPlan: SeededTenantUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    plan = await seedPlan(prisma, { modules: ['estoque', 'financeiro'] });
    tenantWithPlan = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'me-sub-with', role: 'tenant_owner' });
    tenantNoPlan = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'me-sub-none', role: 'tenant_owner' });
    await seedSubscription(tenantContext, tenantWithPlan.tenantId, plan.id);
  });

  afterAll(async () => {
    await cleanupSubscription(tenantContext, tenantWithPlan.tenantId);
    await cleanupTenantWithUser(prisma, tenantContext, tenantWithPlan);
    await cleanupTenantWithUser(prisma, tenantContext, tenantNoPlan);
    await cleanupPlan(prisma, plan);
    await app.close();
  });

  async function loginAs(user: SeededTenantUser): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: user.password, tenantSlug: user.tenantSlug })
      .expect(200);
    return res.body.accessToken;
  }

  it('retorna os modulos do plano quando o tenant tem assinatura', async () => {
    const token = await loginAs(tenantWithPlan);
    const res = await request(app.getHttpServer())
      .get('/v1/tenants/me/subscription')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.status).toBe('active');
    expect(res.body.modules).toEqual(['estoque', 'financeiro']);
  });

  it('sem assinatura nenhuma retorna 200 com modules:[] (nao 404 -- estado normal, nao erro)', async () => {
    const token = await loginAs(tenantNoPlan);
    const res = await request(app.getHttpServer())
      .get('/v1/tenants/me/subscription')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({ status: null, planCode: null, planName: null, modules: [] });
  });

  it('isolamento: tenant B nunca ve a assinatura/modulos do tenant A', async () => {
    const token = await loginAs(tenantNoPlan);
    const res = await request(app.getHttpServer())
      .get('/v1/tenants/me/subscription')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.modules).toEqual([]);
  });

  it('sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/v1/tenants/me/subscription').expect(401);
  });

  it('papel "customer" nao acessa (403)', async () => {
    const customer = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'me-sub-cust', role: 'customer' });
    try {
      const token = await loginAs(customer);
      await request(app.getHttpServer())
        .get('/v1/tenants/me/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    } finally {
      await cleanupTenantWithUser(prisma, tenantContext, customer);
    }
  });
});
