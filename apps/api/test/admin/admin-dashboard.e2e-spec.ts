import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupSuperAdmin, seedSuperAdmin, SeededSuperAdmin } from '../utils/seed-auth-fixtures';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

// "orders" tem RLS forcada -- este endpoint agrega "pedidos do mes" iterando tenant por
// tenant via runInTenantContext (unica forma de somar entre tenants sem violar RLS, ver
// AdminController.dashboard). Teste confirma que um pedido criado num tenant de teste
// entra na contagem, e que isolamento nao vaza (outro tenant sem pedido nao afeta).
describe('GET /v1/admin/dashboard', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;
  let tenant: SeededTenantUser;

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

    tenant = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'dash', role: 'tenant_owner' });
    const category = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.category.create({ data: { tenantId: tenant.tenantId, name: 'Cat' } }),
    );
    const product = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.product.create({ data: { tenantId: tenant.tenantId, categoryId: category.id, name: 'Produto', price: 10 } }),
    );
    await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.order.create({
        data: {
          tenantId: tenant.tenantId, customerId: tenant.userId, idempotencyKey: randomUUID(),
          customerName: 'Cliente', phone: '119999', address: 'Rua', paymentMethod: 'dinheiro',
          deliveryFee: 0, total: 10,
          items: { create: [{ tenantId: tenant.tenantId, productId: product.id, type: 'pizza', name: 'Produto', unitPrice: 10, quantity: 1 }] },
        },
      }),
    );
  });

  afterAll(async () => {
    await tenantContext.runInTenantContext(tenant.tenantId, async (tx) => {
      await tx.orderItem.deleteMany({ where: { tenantId: tenant.tenantId } });
      await tx.order.deleteMany({ where: { tenantId: tenant.tenantId } });
      await tx.product.deleteMany({ where: { tenantId: tenant.tenantId } });
      await tx.category.deleteMany({ where: { tenantId: tenant.tenantId } });
    });
    await cleanupTenantWithUser(prisma, tenantContext, tenant);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('retorna contagem de tenants e pedidos do mes incluindo o pedido recem-criado', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.tenantCount).toBeGreaterThanOrEqual(1);
    expect(res.body.ordersThisMonth).toBeGreaterThanOrEqual(1);
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
