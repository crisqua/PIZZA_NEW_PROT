import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

describe('Secao 3.2 item 2 — IDOR via rota HTTP real protegida por JwtAuthGuard', () => {
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
    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'idor-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'idor-b', role: 'tenant_owner' });

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

  it('acessar o id de um usuario de OUTRO tenant retorna 404 (nunca 403 — nao confirma que existe)', async () => {
    await request(app.getHttpServer())
      .get(`/v1/users/${tenantB.userId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('acessar o proprio id retorna 200 com os dados corretos', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/users/${tenantA.userId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.id).toBe(tenantA.userId);
    expect(res.body.tenantId).toBe(tenantA.tenantId);
  });
});
