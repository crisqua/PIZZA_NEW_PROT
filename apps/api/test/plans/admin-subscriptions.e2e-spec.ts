import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupSuperAdmin, cleanupTenantWithUser, seedSuperAdmin, seedTenantWithUser, SeededSuperAdmin, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupPlan, cleanupSubscription, seedPlan, seedSubscription, SeededPlan } from '../utils/seed-subscription';

describe('/v1/admin/tenants/:tenantId/subscription', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;
  let planX: SeededPlan;
  let planY: SeededPlan;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    superAdmin = await seedSuperAdmin(prisma);
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password })
      .expect(200);
    superAdminToken = loginRes.body.accessToken;

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'sub-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'sub-b', role: 'tenant_owner' });
    planX = await seedPlan(prisma, { modules: [] });
    planY = await seedPlan(prisma, { modules: ['estoque'] });
  });

  afterAll(async () => {
    await cleanupSubscription(tenantContext, tenantA.tenantId);
    await cleanupSubscription(tenantContext, tenantB.tenantId);
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await cleanupPlan(prisma, planX);
    await cleanupPlan(prisma, planY);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('GET antes de existir assinatura retorna 404', async () => {
    await request(app.getHttpServer())
      .get(`/v1/admin/tenants/${tenantA.tenantId}/subscription`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(404);
  });

  it('PATCH sem planId numa criacao retorna 400', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${tenantA.tenantId}/subscription`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'active' })
      .expect(400);
  });

  it('PATCH com planId cria a assinatura', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${tenantA.tenantId}/subscription`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ planId: planX.id })
      .expect(200);

    expect(res.body.planId).toBe(planX.id);
    expect(res.body.status).toBe('active');
  });

  it('PATCH com planId diferente atualiza a MESMA linha (nao duplica)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${tenantA.tenantId}/subscription`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ planId: planY.id })
      .expect(200);

    expect(res.body.planId).toBe(planY.id);

    const rows = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.subscription.findMany({ where: { tenantId: tenantA.tenantId } }),
    );
    expect(rows).toHaveLength(1);
  });

  it('PATCH so com status nao mexe no planId', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${tenantA.tenantId}/subscription`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'cancelled' })
      .expect(200);

    expect(res.body.status).toBe('cancelled');
    expect(res.body.planId).toBe(planY.id);
  });

  it('nao-superadmin recebe 403', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantA.email, password: tenantA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/v1/admin/tenants/${tenantA.tenantId}/subscription`)
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(403);
  });

  it('isolamento real: tenant B nunca enxerga a subscription do tenant A sob RLS', async () => {
    await seedSubscription(tenantContext, tenantB.tenantId, planX.id);

    const rowsUnderA = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) => tx.subscription.findMany());
    expect(rowsUnderA.every((r) => r.tenantId === tenantA.tenantId)).toBe(true);

    const rowsUnderB = await tenantContext.runInTenantContext(tenantB.tenantId, (tx) => tx.subscription.findMany());
    expect(rowsUnderB.every((r) => r.tenantId === tenantB.tenantId)).toBe(true);
  });
});
