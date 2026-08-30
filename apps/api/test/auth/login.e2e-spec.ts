import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { hasCookie } from '../utils/cookies';
import {
  cleanupSuperAdmin,
  cleanupTenantWithUser,
  seedSuperAdmin,
  seedTenantWithUser,
  SeededSuperAdmin,
  SeededTenantUser,
} from '../utils/seed-auth-fixtures';

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? 'pizza_refresh';

describe('POST /v1/auth/login', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let owner: SeededTenantUser;
  let staff: SeededTenantUser;
  let customer: SeededTenantUser;
  let superAdmin: SeededSuperAdmin;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    owner = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'login-owner', role: 'tenant_owner' });
    staff = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'login-staff', role: 'tenant_staff' });
    customer = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'login-customer', role: 'customer' });
    superAdmin = await seedSuperAdmin(prisma);
  });

  afterAll(async () => {
    await cleanupTenantWithUser(prisma, tenantContext, owner);
    await cleanupTenantWithUser(prisma, tenantContext, staff);
    await cleanupTenantWithUser(prisma, tenantContext, customer);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it.each([
    ['tenant_owner', () => owner],
    ['tenant_staff', () => staff],
    ['customer', () => customer],
  ])('login funciona para o papel %s', async (_label, getUser) => {
    const user = getUser();
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: user.password, tenantSlug: user.tenantSlug })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.tenantId).toBe(user.tenantId);
    expect(hasCookie(res, REFRESH_COOKIE_NAME)).toBe(true);
  });

  it('login funciona para platform_superadmin (sem tenantSlug)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.tenantId).toBeNull();
    expect(res.body.user.role).toBe('platform_superadmin');
  });

  it('senha errada retorna 401', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: owner.email, password: 'senha-errada', tenantSlug: owner.tenantSlug })
      .expect(401);
  });

  it('tenantSlug desconhecido retorna 401 (mesmo status de senha errada — sem enumeracao)', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: owner.email, password: owner.password, tenantSlug: 'slug-que-nao-existe' })
      .expect(401);
  });
});
