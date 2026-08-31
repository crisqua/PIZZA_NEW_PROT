import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashPassword } from '../../src/common/password.util';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupCategory, cleanupProduct, seedCategory, seedProduct, SeededCategory, SeededProduct } from '../utils/seed-catalog';

describe('/v1/orders', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;
  let customerA: { id: string; email: string; password: string };
  let categoryA: SeededCategory;
  let categoryB: SeededCategory;
  let pizzaA1: SeededProduct;
  let pizzaA2: SeededProduct;
  let drinkA: SeededProduct;
  let productB: SeededProduct;
  let ownerToken: string;
  let customerToken: string;
  let createdOrderId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'ord-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'ord-b', role: 'tenant_owner' });

    const customerPassword = randomUUID();
    const customerPasswordHash = await hashPassword(customerPassword);
    const customerUser = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.user.create({
        data: {
          tenantId: tenantA.tenantId,
          email: `customer@${tenantA.tenantSlug}.test`,
          name: 'Cliente A',
          role: 'customer',
          passwordHash: customerPasswordHash,
        },
      }),
    );
    customerA = { id: customerUser.id, email: customerUser.email, password: customerPassword };

    categoryA = await seedCategory(tenantContext, tenantA.tenantId, 'Categoria A');
    categoryB = await seedCategory(tenantContext, tenantB.tenantId, 'Categoria B');
    pizzaA1 = await seedProduct(tenantContext, tenantA.tenantId, categoryA.id, { name: 'Marguerita', price: 40, type: 'pizza' });
    pizzaA2 = await seedProduct(tenantContext, tenantA.tenantId, categoryA.id, { name: 'Calabresa', price: 44, type: 'pizza' });
    drinkA = await seedProduct(tenantContext, tenantA.tenantId, categoryA.id, { name: 'Refrigerante', price: 8, type: 'drink' });
    productB = await seedProduct(tenantContext, tenantB.tenantId, categoryB.id, { name: 'Produto B', price: 99, type: 'pizza' });

    const ownerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantA.email, password: tenantA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    ownerToken = ownerLogin.body.accessToken;

    const customerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: customerA.email, password: customerA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    customerToken = customerLogin.body.accessToken;
  });

  afterAll(async () => {
    if (createdOrderId) {
      await tenantContext
        .runInTenantContext(tenantA.tenantId, async (tx) => {
          await tx.orderItem.deleteMany({ where: { orderId: createdOrderId } });
          await tx.order.delete({ where: { id: createdOrderId } });
        })
        .catch(() => undefined);
    }
    await tenantContext.runInTenantContext(tenantA.tenantId, (tx) => tx.order.deleteMany({ where: { tenantId: tenantA.tenantId } }));
    await cleanupProduct(tenantContext, tenantA.tenantId, pizzaA1.id);
    await cleanupProduct(tenantContext, tenantA.tenantId, pizzaA2.id);
    await cleanupProduct(tenantContext, tenantA.tenantId, drinkA.id);
    await cleanupProduct(tenantContext, tenantB.tenantId, productB.id);
    await cleanupCategory(tenantContext, tenantA.tenantId, categoryA.id);
    await cleanupCategory(tenantContext, tenantB.tenantId, categoryB.id);
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await app.close();
  });

  it('401 sem token', async () => {
    await request(app.getHttpServer()).get('/v1/orders').expect(401);
    await request(app.getHttpServer()).post('/v1/orders').set('Idempotency-Key', randomUUID()).send({}).expect(401);
  });

  it('400 sem header Idempotency-Key', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: pizzaA1.id, size: 'oito-pedacos' }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro' })
      .expect(400);
  });

  it('staff (tenant_owner) nao pode criar pedido (403) -- so customer', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: pizzaA1.id, size: 'oito-pedacos' }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro' })
      .expect(403);
  });

  it('pizza sem size retorna 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: pizzaA1.id }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro' })
      .expect(400);
  });

  it('bebida com secondProductId retorna 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [{ productId: drinkA.id, secondProductId: pizzaA1.id, quantity: 1 }],
        phone: '119999',
        address: 'Rua X',
        paymentMethod: 'dinheiro',
      })
      .expect(400);
  });

  it('productId de outro tenant retorna 404 (isolamento cross-tenant -- arquitetura secao 3.2 item 5)', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: productB.id, size: 'oito-pedacos' }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro' })
      .expect(404);
  });

  it('cria pedido meio a meio + bebida, preco calculado no servidor (nunca confia no client)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [
          { productId: pizzaA1.id, secondProductId: pizzaA2.id, size: 'oito-pedacos', quantity: 1 },
          { productId: drinkA.id, quantity: 2 },
        ],
        phone: '11999998888',
        address: 'Rua Teste',
        addressNumber: '100',
        neighborhood: 'Centro',
        paymentMethod: 'dinheiro',
      })
      .expect(201);

    createdOrderId = res.body.id;
    expect(res.body.status).toBe('pending');
    expect(res.body.customerName).toBe('Cliente A');
    // (40+44)/2 * 1.35 = 56.7 -- nunca confiado do client, calculado em OrdersService.
    expect(res.body.items[0].unitPrice).toBe(56.7);
    expect(res.body.items[0].name).toBe('Marguerita + Calabresa');
    expect(res.body.items[1].unitPrice).toBe(8);
    expect(res.body.total).toBe(56.7 + 8 * 2);
    expect(typeof res.body.total).toBe('number');
  });

  it('GET :id -- dono ve (200), outro cliente nao (404)', async () => {
    await request(app.getHttpServer())
      .get(`/v1/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const otherCustomer = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'ord-cust2', role: 'customer' });
    try {
      const login = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: otherCustomer.email, password: otherCustomer.password, tenantSlug: otherCustomer.tenantSlug })
        .expect(200);
      await request(app.getHttpServer())
        .get(`/v1/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(404);
    } finally {
      await cleanupTenantWithUser(prisma, tenantContext, otherCustomer);
    }
  });

  it('GET lista -- cliente ve so os proprios, staff ve todos do tenant', async () => {
    const customerList = await request(app.getHttpServer())
      .get('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(customerList.body.every((o: { customerId: string }) => o.customerId === customerA.id)).toBe(true);
    expect(customerList.body.some((o: { id: string }) => o.id === createdOrderId)).toBe(true);

    const staffList = await request(app.getHttpServer()).get('/v1/orders').set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(staffList.body.some((o: { id: string }) => o.id === createdOrderId)).toBe(true);
  });

  it('maquina de estados: transicao valida (200), invalida (400), cliente nao pode (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'preparing' })
      .expect(403);

    const ok = await request(app.getHttpServer())
      .patch(`/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'preparing' })
      .expect(200);
    expect(ok.body.status).toBe('preparing');

    await request(app.getHttpServer())
      .patch(`/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'completed' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'delivery' })
      .expect(200);
  });
});
