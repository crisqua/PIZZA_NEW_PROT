import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

describe('Secao 3.2 item 4 — manipulacao de tenant_id na query de uma requisicao autenticada', () => {
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
    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'query-ov-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'query-ov-b', role: 'tenant_owner' });

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

  it('?tenantId=<outro tenant> na query nao ressuscita um lookup cross-tenant (continua 404)', async () => {
    await request(app.getHttpServer())
      .get(`/v1/users/${tenantB.userId}?tenantId=${tenantA.tenantId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('query nao muda o resultado do proprio recurso', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/users/${tenantA.userId}?tenantId=${tenantB.tenantId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.tenantId).toBe(tenantA.tenantId);
  });
});
