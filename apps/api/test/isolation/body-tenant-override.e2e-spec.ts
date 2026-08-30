import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

describe('Secao 3.2 item 3 — manipulacao de tenant_id no body de uma requisicao autenticada', () => {
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
    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'body-ov-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'body-ov-b', role: 'tenant_owner' });

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

  it.each(['tenantId', 'tenant_id'])('campo extra "%s" no body vira 400 (whitelist global)', async (field) => {
    await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Novo Nome', [field]: tenantB.tenantId })
      .expect(400);
  });

  it('sem o campo extra funciona, e o tenant da linha nunca muda', async () => {
    const res = await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Novo Nome' })
      .expect(200);

    expect(res.body.name).toBe('Novo Nome');
    expect(res.body.tenantId).toBe(tenantA.tenantId);
  });
});
