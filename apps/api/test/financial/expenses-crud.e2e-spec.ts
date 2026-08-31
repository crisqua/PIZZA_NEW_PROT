import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupPlan, cleanupSubscription, seedPlan, seedSubscription, SeededPlan } from '../utils/seed-subscription';

// Mesmo formato exato de test/inventory/inventory-crud.e2e-spec.ts (Sprint 6) -- segundo
// consumidor real do ModuleGuard/tenant separado por cenario, dessa vez pro modulo
// 'financeiro'.
describe('/v1/financial/expenses', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let planWithFinanceiro: SeededPlan;
  let planWithoutFinanceiro: SeededPlan;
  let tenantWithModule: SeededTenantUser;
  let tenantWithoutModule: SeededTenantUser;
  let tenantNoSubscription: SeededTenantUser;
  let tenantCancelled: SeededTenantUser;
  let tokenWithModule: string;
  let createdExpenseId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    planWithFinanceiro = await seedPlan(prisma, { modules: ['financeiro'] });
    planWithoutFinanceiro = await seedPlan(prisma, { modules: [] });

    tenantWithModule = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fin-with', role: 'tenant_owner' });
    tenantWithoutModule = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fin-without', role: 'tenant_owner' });
    tenantNoSubscription = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fin-none', role: 'tenant_owner' });
    tenantCancelled = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fin-cancelled', role: 'tenant_owner' });

    await seedSubscription(tenantContext, tenantWithModule.tenantId, planWithFinanceiro.id);
    await seedSubscription(tenantContext, tenantWithoutModule.tenantId, planWithoutFinanceiro.id);
    await seedSubscription(tenantContext, tenantCancelled.tenantId, planWithFinanceiro.id, 'cancelled');

    tokenWithModule = await loginAs(tenantWithModule);
  });

  afterAll(async () => {
    if (createdExpenseId) {
      await tenantContext
        .runInTenantContext(tenantWithModule.tenantId, (tx) => tx.expense.delete({ where: { id: createdExpenseId } }))
        .catch(() => undefined);
    }
    for (const t of [tenantWithModule, tenantWithoutModule, tenantNoSubscription, tenantCancelled]) {
      await cleanupSubscription(tenantContext, t.tenantId);
      await cleanupTenantWithUser(prisma, tenantContext, t);
    }
    await cleanupPlan(prisma, planWithFinanceiro);
    await cleanupPlan(prisma, planWithoutFinanceiro);
    await app.close();
  });

  async function loginAs(user: SeededTenantUser): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: user.password, tenantSlug: user.tenantSlug })
      .expect(200);
    return res.body.accessToken;
  }

  // --- comportamento do ModuleGuard, contra a rota real ---

  it('200 quando o plano inclui o modulo pedido', async () => {
    await request(app.getHttpServer())
      .get('/v1/financial/expenses')
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .expect(200);
  });

  it('403 quando o plano NAO inclui o modulo pedido', async () => {
    const token = await loginAs(tenantWithoutModule);
    await request(app.getHttpServer())
      .get('/v1/financial/expenses')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('403 quando o tenant nao tem assinatura nenhuma', async () => {
    const token = await loginAs(tenantNoSubscription);
    await request(app.getHttpServer())
      .get('/v1/financial/expenses')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('403 quando a assinatura esta cancelada, mesmo com o plano incluindo o modulo', async () => {
    const token = await loginAs(tenantCancelled);
    await request(app.getHttpServer())
      .get('/v1/financial/expenses')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('401 sem token (JwtAuthGuard roda antes do ModuleGuard)', async () => {
    await request(app.getHttpServer()).get('/v1/financial/expenses').expect(401);
  });

  // --- CRUD feliz ---

  it('cria uma despesa com amount como number (nao string) e date normalizada', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/financial/expenses')
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .send({ description: 'Compra de insumos', category: 'Insumos', amount: 250.5, date: '2026-08-30' })
      .expect(201);

    createdExpenseId = res.body.id;
    expect(res.body.amount).toBe(250.5);
    expect(typeof res.body.amount).toBe('number');
    expect(res.body.date).toBe('2026-08-30');
  });

  it('categoria fora da lista fechada retorna 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/financial/expenses')
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .send({ description: 'Teste', category: 'CategoriaInvalida', amount: 10, date: '2026-08-30' })
      .expect(400);
  });

  it('lista inclui a despesa criada', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/financial/expenses')
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .expect(200);
    expect(res.body.some((e: { id: string }) => e.id === createdExpenseId)).toBe(true);
  });

  it('PATCH atualiza o valor', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/financial/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .send({ amount: 300 })
      .expect(200);
    expect(res.body.amount).toBe(300);
  });

  it('isolamento: outro tenant (mesmo com o modulo) nunca ve a despesa deste tenant', async () => {
    const other = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fin-other', role: 'tenant_owner' });
    const otherPlan = await seedPlan(prisma, { modules: ['financeiro'] });
    await seedSubscription(tenantContext, other.tenantId, otherPlan.id);
    try {
      const token = await loginAs(other);

      const res = await request(app.getHttpServer())
        .get('/v1/financial/expenses')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.some((e: { id: string }) => e.id === createdExpenseId)).toBe(false);

      await request(app.getHttpServer())
        .get(`/v1/financial/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    } finally {
      await cleanupSubscription(tenantContext, other.tenantId);
      await cleanupTenantWithUser(prisma, tenantContext, other);
      await cleanupPlan(prisma, otherPlan);
    }
  });

  it('DELETE remove a despesa (204), depois GET retorna 404', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/financial/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/financial/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${tokenWithModule}`)
      .expect(404);

    createdExpenseId = '';
  });
});
