import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupPlan, cleanupSubscription, seedPlan, seedSubscription, SeededPlan } from '../utils/seed-subscription';

// Primeiro consumidor real do ModuleGuard (Sprint 4) -- as asserções de comportamento do
// guard que antes viviam em test/plans/module-guard.e2e-spec.ts (via a rota fixture
// _fixtures/estoque-probe, apagada nesta sprint) migraram pra cá, agora contra a rota de
// negócio real /v1/inventory.
describe('/v1/inventory', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let planWithEstoque: SeededPlan;
  let planWithoutEstoque: SeededPlan;
  let tenantWithModule: SeededTenantUser;
  let tenantWithoutModule: SeededTenantUser;
  let tenantNoSubscription: SeededTenantUser;
  let tenantCancelled: SeededTenantUser;
  let tokenWithModule: string;
  let createdItemId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    planWithEstoque = await seedPlan(prisma, { modules: ['estoque'] });
    planWithoutEstoque = await seedPlan(prisma, { modules: [] });

    tenantWithModule = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'inv-with', role: 'tenant_owner' });
    tenantWithoutModule = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'inv-without', role: 'tenant_owner' });
    tenantNoSubscription = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'inv-none', role: 'tenant_owner' });
    tenantCancelled = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'inv-cancelled', role: 'tenant_owner' });

    await seedSubscription(tenantContext, tenantWithModule.tenantId, planWithEstoque.id);
    await seedSubscription(tenantContext, tenantWithoutModule.tenantId, planWithoutEstoque.id);
    await seedSubscription(tenantContext, tenantCancelled.tenantId, planWithEstoque.id, 'cancelled');

    tokenWithModule = await loginAs(tenantWithModule);
  });

  afterAll(async () => {
    if (createdItemId) {
      await tenantContext
        .runInTenantContext(tenantWithModule.tenantId, (tx) => tx.inventoryItem.delete({ where: { id: createdItemId } }))
        .catch(() => undefined);
    }
    for (const t of [tenantWithModule, tenantWithoutModule, tenantNoSubscription, tenantCancelled]) {
      await cleanupSubscription(tenantContext, t.tenantId);
      await cleanupTenantWithUser(prisma, tenantContext, t);
    }
    await cleanupPlan(prisma, planWithEstoque);
    await cleanupPlan(prisma, planWithoutEstoque);
    await app.close();
  });

  async function loginAs(user: SeededTenantUser): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: user.password, tenantSlug: user.tenantSlug })
      .expect(200);
    return res.body.accessToken;
  }

  // --- comportamento do ModuleGuard, agora contra a rota real (DoD literal desta sprint) ---

  it('200 quando o plano inclui o modulo pedido', async () => {
    await request(app.getHttpServer())
      .get('/v1/inventory')
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .expect(200);
  });

  it('403 quando o plano NAO inclui o modulo pedido', async () => {
    const token = await loginAs(tenantWithoutModule);
    await request(app.getHttpServer())
      .get('/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('403 quando o tenant nao tem assinatura nenhuma', async () => {
    const token = await loginAs(tenantNoSubscription);
    await request(app.getHttpServer())
      .get('/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('403 quando a assinatura esta cancelada, mesmo com o plano incluindo o modulo', async () => {
    const token = await loginAs(tenantCancelled);
    await request(app.getHttpServer())
      .get('/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('401 sem token (JwtAuthGuard roda antes do ModuleGuard)', async () => {
    await request(app.getHttpServer()).get('/v1/inventory').expect(401);
  });

  // --- CRUD feliz ---

  it('cria um item com quantity/minQuantity como number (nao string)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/inventory')
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .send({ name: 'Mussarela', unit: 'kg', quantity: 10.5, minQuantity: 5 })
      .expect(201);

    createdItemId = res.body.id;
    expect(res.body.quantity).toBe(10.5);
    expect(typeof res.body.quantity).toBe('number');
    expect(typeof res.body.minQuantity).toBe('number');
  });

  it('lista inclui o item criado', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/inventory')
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .expect(200);
    expect(res.body.some((i: { id: string }) => i.id === createdItemId)).toBe(true);
  });

  it('PATCH atualiza a quantidade', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/inventory/${createdItemId}`)
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .send({ quantity: 9.5 })
      .expect(200);
    expect(res.body.quantity).toBe(9.5);
  });

  it('isolamento: outro tenant (mesmo com o modulo) nunca ve o item deste tenant', async () => {
    const other = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'inv-other', role: 'tenant_owner' });
    const otherPlan = await seedPlan(prisma, { modules: ['estoque'] });
    await seedSubscription(tenantContext, other.tenantId, otherPlan.id);
    try {
      const token = await loginAs(other);

      const res = await request(app.getHttpServer())
        .get('/v1/inventory')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.some((i: { id: string }) => i.id === createdItemId)).toBe(false);

      await request(app.getHttpServer())
        .get(`/v1/inventory/${createdItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    } finally {
      await cleanupSubscription(tenantContext, other.tenantId);
      await cleanupTenantWithUser(prisma, tenantContext, other);
      await cleanupPlan(prisma, otherPlan);
    }
  });

  it('DELETE remove o item (204), depois GET retorna 404', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/inventory/${createdItemId}`)
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/inventory/${createdItemId}`)
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .expect(404);

    createdItemId = '';
  });
});
