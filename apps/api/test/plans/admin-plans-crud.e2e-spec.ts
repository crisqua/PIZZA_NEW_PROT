import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import {
  cleanupSuperAdmin,
  cleanupTenantWithUser,
  seedSuperAdmin,
  seedTenantWithUser,
  SeededSuperAdmin,
  SeededTenantUser,
} from '../utils/seed-auth-fixtures';

describe('/v1/admin/plans — CRUD superadmin', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;
  let nonSuperAdmin: SeededTenantUser;
  let createdPlanId: string;
  // "code" so' aceita os 3 valores fixos do catalogo (trial/pro/enterprise) -- nao pode
  // ser aleatorio por teste como um slug de tenant. afterAll sempre limpa este plano.
  const code = 'trial';

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

    nonSuperAdmin = await seedTenantWithUser(prisma, tenantContext, {
      slugPrefix: 'plans-crud-nonsuper',
      role: 'tenant_owner',
    });
  });

  afterAll(async () => {
    if (createdPlanId) {
      await prisma.plan.delete({ where: { id: createdPlanId } }).catch(() => undefined);
    }
    await cleanupTenantWithUser(prisma, tenantContext, nonSuperAdmin);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('cria um plano', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/admin/plans')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ code, name: 'CRUD Test Plan', price: 199, modules: ['estoque'] })
      .expect(201);

    createdPlanId = res.body.id;
    expect(res.body.price).toBe(199);
    expect(typeof res.body.price).toBe('number');
    expect(res.body.active).toBe(true);
  });

  it('codigo duplicado retorna 409', async () => {
    await request(app.getHttpServer())
      .post('/v1/admin/plans')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ code, name: 'Outro' })
      .expect(409);
  });

  it('nao-superadmin recebe 403', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: nonSuperAdmin.email, password: nonSuperAdmin.password, tenantSlug: nonSuperAdmin.tenantSlug })
      .expect(200);

    await request(app.getHttpServer())
      .get('/v1/admin/plans')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(403);
  });

  it('sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/v1/admin/plans').expect(401);
  });

  it('lista inclui o plano criado', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/plans')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(res.body.some((p: { id: string }) => p.id === createdPlanId)).toBe(true);
  });

  it('get por id inexistente retorna 404', async () => {
    await request(app.getHttpServer())
      .get('/v1/admin/plans/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(404);
  });

  it('update rejeita "code" no body (400, imutavel)', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/admin/plans/${createdPlanId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ code: 'outro-codigo' })
      .expect(400);
  });

  it('update com price:null reverte pra "negociado"', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/admin/plans/${createdPlanId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ price: null })
      .expect(200);
    expect(res.body.price).toBeNull();
  });
});
