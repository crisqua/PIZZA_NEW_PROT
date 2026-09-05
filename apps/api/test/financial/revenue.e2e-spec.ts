import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupCategory, cleanupProduct, seedCategory, seedProduct, SeededCategory, SeededProduct } from '../utils/seed-catalog';
import { cleanupPlan, cleanupSubscription, seedPlan, seedSubscription, SeededPlan } from '../utils/seed-subscription';

// So' 'completed' conta como receita (decisao confirmada com o usuario na Sprint 8) --
// pagamento e' na entrega, pending/preparing/delivery ainda nao e' dinheiro que entrou,
// cancelled obviamente nao conta.
describe('GET /v1/financial/revenue', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let plan: SeededPlan;
  let tenant: SeededTenantUser;
  let category: SeededCategory;
  let product: SeededProduct;
  let token: string;
  const orderIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    plan = await seedPlan(prisma, { modules: ['financeiro'] });
    tenant = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fin-rev', role: 'tenant_owner' });
    await seedSubscription(tenantContext, tenant.tenantId, plan.id);
    category = await seedCategory(tenantContext, tenant.tenantId, 'Categoria Receita');
    // Preco do produto e' irrelevante aqui -- os OrderItems abaixo (seedOrder) sao
    // inseridos direto com unitPrice explicito, nunca passam por OrdersService/o preco
    // real do produto.
    product = await seedProduct(tenantContext, tenant.tenantId, category.id, { name: 'Produto Receita' });

    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenant.email, password: tenant.password, tenantSlug: tenant.tenantSlug })
      .expect(200);
    token = res.body.accessToken;

    await seedOrder('completed', new Date('2026-08-28T12:00:00Z'), 100);
    await seedOrder('completed', new Date('2026-08-28T15:00:00Z'), 50);
    await seedOrder('pending', new Date('2026-08-28T09:00:00Z'), 999);
    await seedOrder('cancelled', new Date('2026-08-29T09:00:00Z'), 999);
    await seedOrder('completed', new Date('2026-08-29T09:00:00Z'), 80);
  });

  afterAll(async () => {
    await tenantContext.runInTenantContext(tenant.tenantId, async (tx) => {
      await tx.orderItem.deleteMany({ where: { tenantId: tenant.tenantId } });
      await tx.order.deleteMany({ where: { tenantId: tenant.tenantId } });
    });
    await cleanupProduct(tenantContext, tenant.tenantId, product.id);
    await cleanupCategory(tenantContext, tenant.tenantId, category.id);
    await cleanupSubscription(tenantContext, tenant.tenantId);
    await cleanupTenantWithUser(prisma, tenantContext, tenant);
    await cleanupPlan(prisma, plan);
    await app.close();
  });

  async function seedOrder(status: string, createdAt: Date, total: number): Promise<void> {
    const order = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.order.create({
        data: {
          tenantId: tenant.tenantId,
          customerId: tenant.userId,
          status,
          idempotencyKey: randomUUID(),
          customerName: 'Cliente Receita',
          phone: '11999999999',
          address: 'Rua Receita',
          paymentMethod: 'dinheiro',
          deliveryFee: 0,
          total,
          createdAt,
          items: { create: [{ tenantId: tenant.tenantId, productId: product.id, type: 'pizza', size: 'oito-pedacos', name: product.id, unitPrice: total, quantity: 1 }] },
        },
      }),
    );
    orderIds.push(order.id);
  }

  it('agrega so os pedidos completed por dia, preenchendo dias sem pedido com 0', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/financial/revenue?from=2026-08-27&to=2026-08-29')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual([
      { date: '2026-08-27', revenue: 0 },
      { date: '2026-08-28', revenue: 150 },
      { date: '2026-08-29', revenue: 80 },
    ]);
  });

  it('401 sem token, 403 sem modulo financeiro', async () => {
    await request(app.getHttpServer()).get('/v1/financial/revenue').expect(401);

    const otherPlan = await seedPlan(prisma, { modules: [] });
    const other = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fin-rev-nomod', role: 'tenant_owner' });
    await seedSubscription(tenantContext, other.tenantId, otherPlan.id);
    try {
      const login = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: other.email, password: other.password, tenantSlug: other.tenantSlug })
        .expect(200);
      await request(app.getHttpServer())
        .get('/v1/financial/revenue')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(403);
    } finally {
      await cleanupSubscription(tenantContext, other.tenantId);
      await cleanupTenantWithUser(prisma, tenantContext, other);
      await cleanupPlan(prisma, otherPlan);
    }
  });
});
