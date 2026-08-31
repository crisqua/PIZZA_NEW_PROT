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

// O teste literal do DoD da Sprint 3 (docs/MVP_SPRINTS.md): "desativar um tenant via
// PATCH /v1/admin/tenants/:id/active faz o proximo login de tenant_owner/tenant_staff
// desse tenant falhar com 403".
describe('PATCH /v1/admin/tenants/:id/active — bloqueio de login', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let owner: SeededTenantUser;
  let staff: SeededTenantUser;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    owner = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'toggle-owner', role: 'tenant_owner' });
    staff = await seedTenantWithUser(prisma, tenantContext, {
      slugPrefix: 'toggle-staff',
      role: 'tenant_staff',
      password: owner.password, // mesma senha, tenant diferente -- so' pra reduzir setup
    });

    superAdmin = await seedSuperAdmin(prisma);
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password })
      .expect(200);
    superAdminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTenantWithUser(prisma, tenantContext, owner);
    await cleanupTenantWithUser(prisma, tenantContext, staff);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('login funciona antes do toggle', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: owner.email, password: owner.password, tenantSlug: owner.tenantSlug })
      .expect(200);
  });

  it('desativar o tenant bloqueia login de tenant_owner e tenant_staff com 403 (nao 401)', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${owner.tenantId}/active`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ active: false })
      .expect(200);

    const ownerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: owner.email, password: owner.password, tenantSlug: owner.tenantSlug })
      .expect(403);
    expect(ownerLogin.body.statusCode).toBe(403);

    await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${staff.tenantId}/active`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ active: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: staff.email, password: staff.password, tenantSlug: staff.tenantSlug })
      .expect(403);
  });

  it('reativar o tenant restaura o login (prova que e' + " dinamico, nao trava pra sempre)", async () => {
    await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${owner.tenantId}/active`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ active: true })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: owner.email, password: owner.password, tenantSlug: owner.tenantSlug })
      .expect(200);
  });
});
