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

describe('Superadmin nunca atravessa tenant, e tenant nunca acessa rota de plataforma', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantUser: SeededTenantUser;
  let superAdmin: SeededSuperAdmin;
  let tenantToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);
    tenantUser = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'super-vs-tenant', role: 'tenant_owner' });
    superAdmin = await seedSuperAdmin(prisma);

    const tenantLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantUser.email, password: tenantUser.password, tenantSlug: tenantUser.tenantSlug })
      .expect(200);
    tenantToken = tenantLogin.body.accessToken;

    const superLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password })
      .expect(200);
    superAdminToken = superLogin.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTenantWithUser(prisma, tenantContext, tenantUser);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('platform_superadmin acessa /admin/whoami', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/whoami')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(res.body.tenantId).toBeNull();
  });

  it('usuario de tenant NAO acessa /admin/whoami (403, RolesGuard)', async () => {
    await request(app.getHttpServer())
      .get('/v1/admin/whoami')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(403);
  });

  it('platform_superadmin NAO acessa /users/me (nao e um dos papeis tenant-scoped)', async () => {
    await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(403);
  });
});
