import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupPlan, cleanupSubscription, seedPlan, seedSubscription, SeededPlan } from '../utils/seed-subscription';

// Via a rota fixture temporaria (src/module-gate-fixture/) — ver comentario la sobre por
// que ela existe so' pra este DoD, ate a Sprint 6 dar um consumidor real ao ModuleGuard.
describe('ModuleGuard via GET /v1/_fixtures/estoque-probe', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let planWithEstoque: SeededPlan;
  let planWithoutEstoque: SeededPlan;
  let tenantWithModule: SeededTenantUser;
  let tenantWithoutModule: SeededTenantUser;
  let tenantNoSubscription: SeededTenantUser;
  let tenantCancelled: SeededTenantUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    planWithEstoque = await seedPlan(prisma, { modules: ['estoque'] });
    planWithoutEstoque = await seedPlan(prisma, { modules: [] });

    tenantWithModule = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'gate-with', role: 'tenant_owner' });
    tenantWithoutModule = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'gate-without', role: 'tenant_owner' });
    tenantNoSubscription = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'gate-none', role: 'tenant_owner' });
    tenantCancelled = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'gate-cancelled', role: 'tenant_owner' });

    await seedSubscription(tenantContext, tenantWithModule.tenantId, planWithEstoque.id);
    await seedSubscription(tenantContext, tenantWithoutModule.tenantId, planWithoutEstoque.id);
    await seedSubscription(tenantContext, tenantCancelled.tenantId, planWithEstoque.id, 'cancelled');
  });

  afterAll(async () => {
    for (const t of [tenantWithModule, tenantWithoutModule, tenantNoSubscription, tenantCancelled]) {
      await cleanupSubscription(tenantContext, t.tenantId);
      await cleanupTenantWithUser(prisma, tenantContext, t);
    }
    await cleanupPlan(prisma, planWithEstoque);
    await cleanupPlan(prisma, planWithoutEstoque);
    await app.close();
  });

  async function loginAs(user: SeededTenantUser): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: user.password, tenantSlug: user.tenantSlug })
      .expect(200);
    return res.body.accessToken;
  }

  it('200 quando o plano inclui o modulo pedido', async () => {
    const token = await loginAs(tenantWithModule);
    await request(app.getHttpServer())
      .get('/v1/_fixtures/estoque-probe')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('403 quando o plano NAO inclui o modulo pedido', async () => {
    const token = await loginAs(tenantWithoutModule);
    await request(app.getHttpServer())
      .get('/v1/_fixtures/estoque-probe')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('403 quando o tenant nao tem assinatura nenhuma', async () => {
    const token = await loginAs(tenantNoSubscription);
    await request(app.getHttpServer())
      .get('/v1/_fixtures/estoque-probe')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('403 quando a assinatura esta cancelada, mesmo com o plano incluindo o modulo', async () => {
    const token = await loginAs(tenantCancelled);
    await request(app.getHttpServer())
      .get('/v1/_fixtures/estoque-probe')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('401 sem token (JwtAuthGuard roda antes do ModuleGuard)', async () => {
    await request(app.getHttpServer()).get('/v1/_fixtures/estoque-probe').expect(401);
  });
});
