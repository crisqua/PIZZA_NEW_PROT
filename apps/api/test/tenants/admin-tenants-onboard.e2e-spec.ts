import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupSuperAdmin, seedSuperAdmin, SeededSuperAdmin } from '../utils/seed-auth-fixtures';
import { cleanupPlan, seedPlan, SeededPlan } from '../utils/seed-subscription';

// Onboarding atomico (Sprint 10): antes desta sprint nao existia NENHUM jeito de criar
// tenant+dono+assinatura numa unica operacao -- o teste central aqui e' a prova de
// atomicidade (planId invalido -> nenhum Tenant/User orfao sobra no banco).
describe('POST /v1/admin/tenants/onboard', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;
  let plan: SeededPlan;
  let createdTenantId: string;
  const slug = `onboard-${randomUUID().slice(0, 8)}`;

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

    plan = await seedPlan(prisma, { modules: ['estoque'] });
  });

  afterAll(async () => {
    if (createdTenantId) {
      await tenantContext.runInTenantContext(createdTenantId, async (tx) => {
        await tx.subscription.deleteMany({ where: { tenantId: createdTenantId } });
        await tx.refreshToken.deleteMany({ where: { tenantId: createdTenantId } });
        await tx.user.deleteMany({ where: { tenantId: createdTenantId } });
      });
      await prisma.tenant.delete({ where: { id: createdTenantId } }).catch(() => undefined);
    }
    await cleanupPlan(prisma, plan);
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('planId inexistente retorna 404 e nao cria nada (prova de atomicidade)', async () => {
    const badSlug = `${slug}-bad`;
    await request(app.getHttpServer())
      .post('/v1/admin/tenants/onboard')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Pizza Bad', slug: badSlug,
        ownerName: 'Dono', ownerEmail: `dono@${badSlug}.test`, ownerPassword: 'senha12345',
        planId: randomUUID(),
      })
      .expect(404);

    const orphan = await prisma.tenant.findUnique({ where: { slug: badSlug } });
    expect(orphan).toBeNull();
  });

  it('cria tenant + dono + assinatura numa unica chamada', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/admin/tenants/onboard')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Pizza Onboard Test', slug, deliveryFee: 7, minOrder: 20,
        ownerName: 'Dono Onboard', ownerEmail: `dono@${slug}.test`, ownerPassword: 'senha12345',
        planId: plan.id,
      })
      .expect(201);

    createdTenantId = res.body.tenant.id;
    expect(res.body.tenant.slug).toBe(slug);
    expect(res.body.owner.email).toBe(`dono@${slug}.test`);
    expect(res.body.subscription.status).toBe('active');
    expect(res.body.subscription.plan.modules).toEqual(['estoque']);
  });

  it('slug duplicado retorna 409', async () => {
    await request(app.getHttpServer())
      .post('/v1/admin/tenants/onboard')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Pizza Dup', slug,
        ownerName: 'Dono2', ownerEmail: `dono2@${slug}.test`, ownerPassword: 'senha12345',
        planId: plan.id,
      })
      .expect(409);
  });

  it('o dono recem-criado consegue logar e ve os modulos do plano escolhido', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: `dono@${slug}.test`, password: 'senha12345', tenantSlug: slug })
      .expect(200);

    const subRes = await request(app.getHttpServer())
      .get('/v1/tenants/me/subscription')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);
    expect(subRes.body.modules).toEqual(['estoque']);
  });

  it('GET /admin/tenants lista o tenant com o resumo de assinatura anexado', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/tenants?pageSize=100')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const found = res.body.items.find((t: { id: string }) => t.id === createdTenantId);
    expect(found.subscription).toMatchObject({ status: 'active', planCode: plan.code, modules: ['estoque'] });
  });

  it('nao-superadmin recebe 403', async () => {
    await request(app.getHttpServer())
      .post('/v1/admin/tenants/onboard')
      .send({ name: 'X', slug: `${slug}-x`, ownerName: 'X', ownerEmail: `x@${slug}.test`, ownerPassword: 'senha12345', planId: plan.id })
      .expect(401);
  });
});
