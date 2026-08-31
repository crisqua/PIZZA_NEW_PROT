import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupCategory, seedCategory, SeededCategory } from '../utils/seed-catalog';

describe('/v1/catalog/categories', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;
  let tokenA: string;
  let categoryA1: SeededCategory;
  let categoryA2: SeededCategory;
  let categoryB: SeededCategory;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'cat-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'cat-b', role: 'tenant_owner' });

    categoryA1 = await seedCategory(tenantContext, tenantA.tenantId, 'Classicas');
    categoryA2 = await seedCategory(tenantContext, tenantA.tenantId, 'Carnes');
    categoryB = await seedCategory(tenantContext, tenantB.tenantId, 'Doces');

    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantA.email, password: tenantA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    tokenA = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await cleanupCategory(tenantContext, tenantA.tenantId, categoryA1.id).catch(() => undefined);
    await cleanupCategory(tenantContext, tenantA.tenantId, categoryA2.id).catch(() => undefined);
    await cleanupCategory(tenantContext, tenantB.tenantId, categoryB.id).catch(() => undefined);
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await app.close();
  });

  it('cria uma categoria', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/catalog/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Frango' })
      .expect(201);
    expect(res.body.name).toBe('Frango');
    expect(res.body.tenantId).toBe(tenantA.tenantId);
    await cleanupCategory(tenantContext, tenantA.tenantId, res.body.id);
  });

  it('nome vazio retorna 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/catalog/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '' })
      .expect(400);
  });

  it('customer nao acessa (403)', async () => {
    const customer = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'cat-cust', role: 'customer' });
    try {
      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: customer.email, password: customer.password, tenantSlug: customer.tenantSlug })
        .expect(200);
      await request(app.getHttpServer())
        .get('/v1/catalog/categories')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(403);
    } finally {
      await cleanupTenantWithUser(prisma, tenantContext, customer);
    }
  });

  it('sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/v1/catalog/categories').expect(401);
  });

  it('lista retorna exatamente as categorias do proprio tenant, nunca as de outro', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/catalog/categories')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const ids = res.body.map((c: { id: string }) => c.id);
    expect(ids).toEqual(expect.arrayContaining([categoryA1.id, categoryA2.id]));
    expect(ids).not.toContain(categoryB.id);
  });

  it('GET por id de categoria de outro tenant retorna 404', async () => {
    await request(app.getHttpServer())
      .get(`/v1/catalog/categories/${categoryB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('PATCH atualiza o nome', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/catalog/categories/${categoryA1.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Classicas Renomeada' })
      .expect(200);
    expect(res.body.name).toBe('Classicas Renomeada');
  });
});
