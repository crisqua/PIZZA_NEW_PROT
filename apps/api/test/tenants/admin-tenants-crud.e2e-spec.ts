import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupSuperAdmin, seedSuperAdmin, SeededSuperAdmin } from '../utils/seed-auth-fixtures';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

describe('/v1/admin/tenants — CRUD superadmin', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;
  let nonSuperAdmin: SeededTenantUser;
  let createdTenantId: string;
  const slug = `admin-crud-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    superAdmin = await seedSuperAdmin(prisma);
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password })
      .expect(200);
    superAdminToken = loginRes.body.accessToken;

    const tenantContext = app.get(TenantContextService);
    nonSuperAdmin = await seedTenantWithUser(prisma, tenantContext, {
      slugPrefix: 'admin-crud-nonsuper',
      role: 'tenant_owner',
    });
  });

  afterAll(async () => {
    if (createdTenantId) {
      await prisma.tenant.delete({ where: { id: createdTenantId } }).catch(() => undefined);
    }
    const tenantContext = app.get(TenantContextService);
    await cleanupTenantWithUser(prisma, tenantContext, nonSuperAdmin);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('cria um tenant com os defaults aplicados', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/admin/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Admin CRUD Test', slug })
      .expect(201);

    createdTenantId = res.body.id;
    expect(res.body.active).toBe(true);
    expect(res.body.primaryColor).toBe('#C9A84C');
    expect(res.body.logo).toBe('🍕');
    expect(res.body.deliveryFee).toBe(0);
    expect(typeof res.body.deliveryFee).toBe('number');
  });

  it('slug duplicado retorna 409', async () => {
    await request(app.getHttpServer())
      .post('/v1/admin/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Outro', slug })
      .expect(409);
  });

  it('nao-superadmin recebe 403', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: nonSuperAdmin.email, password: nonSuperAdmin.password, tenantSlug: nonSuperAdmin.tenantSlug })
      .expect(200);

    await request(app.getHttpServer())
      .get('/v1/admin/tenants')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(403);
  });

  it('sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/v1/admin/tenants').expect(401);
  });

  it('lista paginada inclui o tenant criado', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/tenants?page=1&pageSize=100')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(100);
    expect(res.body.items.some((t: { id: string }) => t.id === createdTenantId)).toBe(true);
  });

  it('get por id inexistente retorna 404', async () => {
    await request(app.getHttpServer())
      .get('/v1/admin/tenants/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(404);
  });

  it('update rejeita "active" no body (400, so' + ' o toggle dedicado muda isso)', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${createdTenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ active: false })
      .expect(400);
  });

  it('update valido reflete os campos novos', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${createdTenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ primaryColor: '#ABCDEF', deliveryFee: 9.9 })
      .expect(200);

    expect(res.body.primaryColor).toBe('#ABCDEF');
    expect(res.body.deliveryFee).toBe(9.9);
  });
});
