import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashPassword } from '../../src/common/password.util';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupCategory, cleanupProduct, seedCategory, seedProduct, SeededCategory, SeededProduct } from '../utils/seed-catalog';

// Teste literal do DoD da Sprint 7 e da arquitetura secao 3.2 item 7: "duas requisicoes
// simultaneas de criacao de pedido com a mesma chave de idempotencia -> apenas um pedido
// e' criado". Promise.all real (mesma tecnica de concorrencia real do
// double-booking-concurrency do Barbearia), nao uma chamada sequencial disfarcada.
describe('Idempotencia na criacao de pedido (POST /v1/orders)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenant: SeededTenantUser;
  let customerToken: string;
  let category: SeededCategory;
  let drink: SeededProduct;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    tenant = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'idem', role: 'tenant_owner' });

    const customerPassword = randomUUID();
    const customerPasswordHash = await hashPassword(customerPassword);
    await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.user.create({
        data: {
          tenantId: tenant.tenantId,
          email: `customer@${tenant.tenantSlug}.test`,
          name: 'Cliente Idem',
          role: 'customer',
          passwordHash: customerPasswordHash,
        },
      }),
    );

    category = await seedCategory(tenantContext, tenant.tenantId, 'Categoria Idem');
    drink = await seedProduct(tenantContext, tenant.tenantId, category.id, { name: 'Agua', price: 5, type: 'drink' });

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: `customer@${tenant.tenantSlug}.test`, password: customerPassword, tenantSlug: tenant.tenantSlug })
      .expect(200);
    customerToken = login.body.accessToken;
  });

  afterAll(async () => {
    await tenantContext.runInTenantContext(tenant.tenantId, async (tx) => {
      await tx.orderItem.deleteMany({ where: { tenantId: tenant.tenantId } });
      await tx.order.deleteMany({ where: { tenantId: tenant.tenantId } });
    });
    await cleanupProduct(tenantContext, tenant.tenantId, drink.id);
    await cleanupCategory(tenantContext, tenant.tenantId, category.id);
    await cleanupTenantWithUser(prisma, tenantContext, tenant);
    await app.close();
  });

  it('duas requisicoes concorrentes com a mesma Idempotency-Key criam so 1 pedido', async () => {
    const idempotencyKey = randomUUID();
    const payload = { items: [{ productId: drink.id, quantity: 1 }], phone: '119999', address: 'Rua Idem', paymentMethod: 'dinheiro' };

    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post('/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload),
      request(app.getHttpServer())
        .post('/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload),
    ]);

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
    expect(resA.body.id).toBe(resB.body.id);

    const count = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.order.count({ where: { tenantId: tenant.tenantId, idempotencyKey } }),
    );
    expect(count).toBe(1);
  });

  it('chave de idempotencia diferente cria um pedido novo (nao e um cache global)', async () => {
    const payload = { items: [{ productId: drink.id, quantity: 1 }], phone: '119999', address: 'Rua Idem', paymentMethod: 'dinheiro' };

    const resA = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send(payload)
      .expect(201);
    const resB = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send(payload)
      .expect(201);

    expect(resA.body.id).not.toBe(resB.body.id);
  });
});
