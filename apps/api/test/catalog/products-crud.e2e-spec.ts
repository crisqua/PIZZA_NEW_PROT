import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupCategory, cleanupProduct, seedCategory, seedProduct, SeededCategory, SeededProduct } from '../utils/seed-catalog';

describe('/v1/catalog/products', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;
  let tokenA: string;
  let categoryA: SeededCategory;
  let categoryB: SeededCategory;
  let productB: SeededProduct;
  let createdProductId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'prod-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'prod-b', role: 'tenant_owner' });
    categoryA = await seedCategory(tenantContext, tenantA.tenantId, 'Categoria A');
    categoryB = await seedCategory(tenantContext, tenantB.tenantId, 'Categoria B');
    productB = await seedProduct(tenantContext, tenantB.tenantId, categoryB.id, { name: 'Produto B' });

    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantA.email, password: tenantA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    tokenA = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (createdProductId) {
      await cleanupProduct(tenantContext, tenantA.tenantId, createdProductId).catch(() => undefined);
    }
    await cleanupProduct(tenantContext, tenantB.tenantId, productB.id).catch(() => undefined);
    await cleanupCategory(tenantContext, tenantA.tenantId, categoryA.id).catch(() => undefined);
    await cleanupCategory(tenantContext, tenantB.tenantId, categoryB.id).catch(() => undefined);
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await app.close();
  });

  it('cria um produto com defaults e price como number (nao string)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/catalog/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Margherita', price: 45.9, categoryId: categoryA.id })
      .expect(201);

    createdProductId = res.body.id;
    expect(res.body.price).toBe(45.9);
    expect(typeof res.body.price).toBe('number');
    expect(res.body.available).toBe(true);
    expect(res.body.featured).toBe(false);
  });

  it('categoryId inexistente retorna 404', async () => {
    await request(app.getHttpServer())
      .post('/v1/catalog/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Produto Fantasma', price: 10, categoryId: '00000000-0000-0000-0000-000000000000' })
      .expect(404);
  });

  it('categoryId de outro tenant retorna 404 (mesmo resultado do inexistente, por design)', async () => {
    await request(app.getHttpServer())
      .post('/v1/catalog/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Produto Cross-Tenant', price: 10, categoryId: categoryB.id })
      .expect(404);
  });

  it('customer nao acessa (403); sem token 401', async () => {
    const customer = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'prod-cust', role: 'customer' });
    try {
      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: customer.email, password: customer.password, tenantSlug: customer.tenantSlug })
        .expect(200);
      await request(app.getHttpServer())
        .get('/v1/catalog/products')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(403);
    } finally {
      await cleanupTenantWithUser(prisma, tenantContext, customer);
    }
    await request(app.getHttpServer()).get('/v1/catalog/products').expect(401);
  });

  it('lista retorna exatamente os produtos do proprio tenant', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/catalog/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const ids = res.body.map((p: { id: string }) => p.id);
    expect(ids).toContain(createdProductId);
    expect(ids).not.toContain(productB.id);
  });

  it('GET por id de produto de outro tenant retorna 404', async () => {
    await request(app.getHttpServer())
      .get(`/v1/catalog/products/${productB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('PATCH atualiza campos', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/catalog/products/${createdProductId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ available: false, price: 49.9 })
      .expect(200);
    expect(res.body.available).toBe(false);
    expect(res.body.price).toBe(49.9);
  });

  it('DELETE remove o produto (204), depois GET retorna 404', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/catalog/products/${createdProductId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/catalog/products/${createdProductId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);

    createdProductId = '';
  });

  it('DELETE de categoria com produto vinculado retorna 409', async () => {
    const tempCategory = await seedCategory(tenantContext, tenantA.tenantId, 'Categoria Temp');
    const tempProduct = await seedProduct(tenantContext, tenantA.tenantId, tempCategory.id);
    try {
      await request(app.getHttpServer())
        .delete(`/v1/catalog/categories/${tempCategory.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(409);
    } finally {
      await cleanupProduct(tenantContext, tenantA.tenantId, tempProduct.id);
      await cleanupCategory(tenantContext, tenantA.tenantId, tempCategory.id);
    }
  });
});
