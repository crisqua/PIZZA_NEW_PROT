import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

describe('/v1/tenants/me — self-service', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;
  let tokenA: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);
    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'me-iso-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'me-iso-b', role: 'tenant_staff' });

    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantA.email, password: tenantA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    tokenA = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await app.close();
  });

  it('GET retorna os dados do proprio tenant', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/tenants/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.id).toBe(tenantA.tenantId);
  });

  it('sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/v1/tenants/me').expect(401);
  });

  it.each(['active', 'slug'])('PATCH rejeita "%s" no body (400)', async (field) => {
    await request(app.getHttpServer())
      .patch('/v1/tenants/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Nome Valido', [field]: field === 'active' ? false : 'outro-slug' })
      .expect(400);
  });

  it(
    'PATCH atualiza o proprio tenant e NAO afeta outro tenant — real invariante de ' +
      'isolamento aqui (a rota nem tem :id pra tentar sobrescrever)',
    async () => {
      const before = await prisma.tenant.findUnique({ where: { id: tenantB.tenantId } });

      const res = await request(app.getHttpServer())
        .patch('/v1/tenants/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Tenant A Renomeado', primaryColor: '#112233' })
        .expect(200);

      expect(res.body.name).toBe('Tenant A Renomeado');
      expect(res.body.id).toBe(tenantA.tenantId);

      const after = await prisma.tenant.findUnique({ where: { id: tenantB.tenantId } });
      expect(after).toEqual(before);
    },
  );

  it('papel "customer" nao acessa /tenants/me (403)', async () => {
    const customer = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'me-iso-cust', role: 'customer' });
    try {
      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: customer.email, password: customer.password, tenantSlug: customer.tenantSlug })
        .expect(200);

      await request(app.getHttpServer())
        .get('/v1/tenants/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(403);
    } finally {
      await cleanupTenantWithUser(prisma, tenantContext, customer);
    }
  });
});
