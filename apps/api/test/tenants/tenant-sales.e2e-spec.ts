import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupSuperAdmin, seedSuperAdmin, SeededSuperAdmin } from '../utils/seed-auth-fixtures';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

// Sprint "Mudanca de Dashboard" (2026-09-26): substitui o agregado cross-tenant que
// saiu de GET /admin/dashboard (ver admin-dashboard.e2e-spec.ts) -- consulta
// pedidos/receita/usuarios de UMA pizzaria por vez, sob demanda. Abre 1 unica
// transacao (RLS de orders/users), nunca um loop pelas N pizzarias da plataforma.
describe('GET /v1/admin/tenants/:id/sales', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;

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

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'salesa', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'salesb', role: 'tenant_owner' });

    const categoryA = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.category.create({ data: { tenantId: tenantA.tenantId, name: 'Cat' } }),
    );
    const productA = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.product.create({ data: { tenantId: tenantA.tenantId, categoryId: categoryA.id, name: 'Produto', price: 10 } }),
    );
    // Pedido pendente -- conta pra "ordersThisMonth", nao pra receita (so' 'completed' e'
    // dinheiro que entrou de verdade, mesma convencao da Sprint 8/RevenueService).
    await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.order.create({
        data: {
          tenantId: tenantA.tenantId, customerId: tenantA.userId, idempotencyKey: randomUUID(),
          orderCode: randomUUID().replace(/-/g, '').slice(0, 16),
          customerName: 'Cliente', phone: '119999', address: 'Rua', paymentMethod: 'dinheiro',
          deliveryFee: 0, total: 10,
          items: { create: [{ tenantId: tenantA.tenantId, productId: productA.id, type: 'pizza', name: 'Produto', unitPrice: 10, quantity: 1 }] },
        },
      }),
    );
    // Pedido completed -- conta pra receita/monthlyOrderVolume tambem.
    await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.order.create({
        data: {
          tenantId: tenantA.tenantId, customerId: tenantA.userId, idempotencyKey: randomUUID(),
          orderCode: randomUUID().replace(/-/g, '').slice(0, 16),
          status: 'completed',
          customerName: 'Cliente', phone: '119999', address: 'Rua', paymentMethod: 'dinheiro',
          deliveryFee: 0, total: 150,
          items: { create: [{ tenantId: tenantA.tenantId, productId: productA.id, type: 'pizza', name: 'Produto', unitPrice: 150, quantity: 1 }] },
        },
      }),
    );
  });

  afterAll(async () => {
    await tenantContext.runInTenantContext(tenantA.tenantId, async (tx) => {
      await tx.orderItem.deleteMany({ where: { tenantId: tenantA.tenantId } });
      await tx.order.deleteMany({ where: { tenantId: tenantA.tenantId } });
      await tx.product.deleteMany({ where: { tenantId: tenantA.tenantId } });
      await tx.category.deleteMany({ where: { tenantId: tenantA.tenantId } });
    });
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('retorna pedidos/receita/usuarios da pizzaria pedida, com o mes atual tendo 2 pedidos e receita de 150', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/admin/tenants/${tenantA.tenantId}/sales`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.tenantId).toBe(tenantA.tenantId);
    expect(res.body.tenantSlug).toBe(tenantA.tenantSlug);
    expect(res.body.ordersThisMonth).toBeGreaterThanOrEqual(2);
    expect(res.body.revenueThisMonth).toBeGreaterThanOrEqual(150);
    expect(res.body.userCount).toBeGreaterThanOrEqual(1);

    expect(res.body.monthlyOrderVolume).toHaveLength(6);
    const currentMonth = res.body.monthlyOrderVolume[5];
    expect(currentMonth.ordersCompleted).toBeGreaterThanOrEqual(1);
    expect(currentMonth.revenue).toBeGreaterThanOrEqual(150);
  });

  it('isolamento: pedido/usuario do tenant A nao vaza pra consulta do tenant B', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/admin/tenants/${tenantB.tenantId}/sales`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.tenantId).toBe(tenantB.tenantId);
    expect(res.body.ordersThisMonth).toBe(0);
    expect(res.body.revenueThisMonth).toBe(0);
    expect(res.body.userCount).toBeGreaterThanOrEqual(1);
    expect(res.body.userCount).toBeLessThan(2);
  });

  it('tenant inexistente retorna 404', async () => {
    await request(app.getHttpServer())
      .get(`/v1/admin/tenants/${randomUUID()}/sales`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(404);
  });

  it('nao-superadmin recebe 403; sem token 401', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantA.email, password: tenantA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/v1/admin/tenants/${tenantA.tenantId}/sales`)
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(403);
    await request(app.getHttpServer()).get(`/v1/admin/tenants/${tenantA.tenantId}/sales`).expect(401);
  });
});
