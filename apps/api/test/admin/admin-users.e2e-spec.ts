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

// "users" tem RLS forcada, e a role do banco (pizza_app) e' NOBYPASSRLS -- o diretorio
// cross-tenant (AdminUsersService) percorre os tenants via runInTenantContext em vez de
// tentar ignorar RLS, mesmo padrao ja validado desde a Sprint 22 (AdminDashboardService).
// Este teste confirma que a listagem cruza tenants de verdade (nao so' o primeiro), que
// os 2 filtros funcionam, e que so' superadmin acessa.
describe('GET /v1/admin/users', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    superAdmin = await seedSuperAdmin(prisma);
    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'adm-usr-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'adm-usr-b', role: 'tenant_staff' });

    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password })
      .expect(200);
    superAdminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('lista usuarios de TODOS os tenants ao mesmo tempo (cruza tenant A e B)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const emails = res.body.items.map((u: { email: string }) => u.email);
    expect(emails).toContain(tenantA.email);
    expect(emails).toContain(tenantB.email);
  });

  it('filtro por role=platform_superadmin retorna so usuarios de plataforma (tenantId null)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/users?role=platform_superadmin')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    for (const item of res.body.items) {
      expect(item.role).toBe('platform_superadmin');
      expect(item.tenantId).toBeNull();
    }
  });

  it('filtro por tenantId retorna so usuarios daquele tenant', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/admin/users?tenantId=${tenantA.tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].email).toBe(tenantA.email);
    expect(res.body.items[0].tenantName).toBe(tenantA.tenantSlug);
  });

  it('paginacao funciona sobre o resultado agregado', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/users?page=1&pageSize=1')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(1);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  it('tenant_owner nao pode acessar (403); sem token (401)', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantA.email, password: tenantA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    await request(app.getHttpServer())
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(403);
    await request(app.getHttpServer()).get('/v1/admin/users').expect(401);
  });
});
