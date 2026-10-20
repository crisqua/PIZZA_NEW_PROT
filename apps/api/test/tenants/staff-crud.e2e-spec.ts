import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { extractCookieValue } from '../utils/cookies';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupPlan, cleanupSubscription, seedPlan, seedSubscription, SeededPlan } from '../utils/seed-subscription';

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? 'pizza_refresh';

// Sprint "Equipe" (2026-10-19/20) -- fecha o gap ja documentado em
// docs/pizzaria_sprints.md: nenhum caminho de codigo criava um usuario role:'tenant_staff'
// antes desta sprint. Cobre tanto o CRUD basico (criar/listar/editar/ativar/desativar)
// quanto o modelo de permissao por funcionario (decisao 9): "pedidos"/"cardapio" sao
// feature core, "estoque"/"financeiro" exigem o duplo portao (modulo contratado pelo
// tenant E permissao marcada pro funcionario especifico).
describe('/v1/tenants/me/staff', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let planFull: SeededPlan;
  let planBare: SeededPlan;
  let tenantA: SeededTenantUser; // owner, plano com estoque+financeiro
  let tenantB: SeededTenantUser; // owner, plano sem nenhum modulo pago (isolamento + validacao de modulo)
  let customerA: SeededTenantUser;
  let ownerTokenA: string;
  let ownerTokenB: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    planFull = await seedPlan(prisma, { modules: ['estoque', 'financeiro'] });
    planBare = await seedPlan(prisma, { modules: [] });

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'staff-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'staff-b', role: 'tenant_owner' });
    customerA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'staff-a-cust', role: 'customer' });

    await seedSubscription(prisma, tenantContext, tenantA.tenantId, planFull.id);
    await seedSubscription(prisma, tenantContext, tenantB.tenantId, planBare.id);

    ownerTokenA = await loginAs(tenantA);
    ownerTokenB = await loginAs(tenantB);
  });

  afterAll(async () => {
    for (const t of [tenantA, tenantB, customerA]) {
      await cleanupSubscription(tenantContext, t.tenantId).catch(() => undefined);
      await cleanupTenantWithUser(prisma, tenantContext, t);
    }
    await cleanupPlan(prisma, planFull);
    await cleanupPlan(prisma, planBare);
    await app.close();
  });

  async function loginAs(user: SeededTenantUser): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: user.password, tenantSlug: user.tenantSlug })
      .expect(200);
    return res.body.accessToken;
  }

  async function createStaffMember(
    token: string,
    overrides: Partial<{ name: string; email: string; password: string; phone: string; permissions: string[] }> = {},
  ) {
    const res = await request(app.getHttpServer())
      .post('/v1/tenants/me/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: overrides.name ?? 'Funcionario Teste',
        email: overrides.email ?? `staff-${Date.now()}-${Math.random().toString(36).slice(2)}@staff-a.test`,
        password: overrides.password ?? 'senha12345',
        phone: '(11) 90000-0000',
        position: 'Atendente',
        contractType: 'CLT',
        permissions: overrides.permissions,
      })
      .expect(201);
    return res.body;
  }

  it('dono cria funcionario — 201, resposta nunca inclui senha/hash', async () => {
    const body = await createStaffMember(ownerTokenA, { email: 'carlos@staff-a.test' });
    expect(body.id).toEqual(expect.any(String));
    expect(body.name).toBe('Funcionario Teste');
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');
    expect(body.permissions).toEqual([]);
    expect(body.active).toBe(true);
  });

  it('email duplicado no mesmo tenant retorna 409 (nao 500 cru)', async () => {
    await createStaffMember(ownerTokenA, { email: 'duplicado@staff-a.test' });
    await request(app.getHttpServer())
      .post('/v1/tenants/me/staff')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({ name: 'Outro', email: 'duplicado@staff-a.test', password: 'senha12345', phone: '(11) 90000-0000' })
      .expect(409);
  });

  it('tenant_staff nao pode gerenciar a Equipe (403)', async () => {
    const staff = await createStaffMember(ownerTokenA, { email: 'semacesso@staff-a.test', password: 'senha12345' });
    const staffToken = await loginAs({ ...tenantA, email: staff.email, password: 'senha12345' });

    await request(app.getHttpServer())
      .post('/v1/tenants/me/staff')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'X', email: 'x@staff-a.test', password: 'senha12345', phone: '1' })
      .expect(403);

    await request(app.getHttpServer())
      .get('/v1/tenants/me/staff')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('customer nao pode gerenciar a Equipe (403)', async () => {
    const customerToken = await loginAs(customerA);
    await request(app.getHttpServer())
      .get('/v1/tenants/me/staff')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('GET lista funcionarios do proprio tenant', async () => {
    await createStaffMember(ownerTokenA, { email: 'listagem@staff-a.test' });
    const res = await request(app.getHttpServer())
      .get('/v1/tenants/me/staff')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .expect(200);
    expect(res.body.some((s: { email: string }) => s.email === 'listagem@staff-a.test')).toBe(true);
  });

  it('isolamento: dono do tenant B nao consegue editar funcionario do tenant A (404)', async () => {
    const staffOfA = await createStaffMember(ownerTokenA, { email: 'isolado@staff-a.test' });
    await request(app.getHttpServer())
      .patch(`/v1/tenants/me/staff/${staffOfA.id}`)
      .set('Authorization', `Bearer ${ownerTokenB}`)
      .send({ name: 'Hackeado' })
      .expect(404);
  });

  it('GET contract-types/positions devolve os defaults', async () => {
    const contractTypes = await request(app.getHttpServer())
      .get('/v1/tenants/me/staff/contract-types')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .expect(200);
    expect(contractTypes.body).toEqual(expect.arrayContaining(['CLT', 'Freelancer']));

    const positions = await request(app.getHttpServer())
      .get('/v1/tenants/me/staff/positions')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .expect(200);
    expect(positions.body).toEqual(expect.arrayContaining(['Atendente', 'Pizzaiolo', 'Motoboy']));
  });

  it('criar funcionario com permissao de modulo nao contratado retorna 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/tenants/me/staff')
      .set('Authorization', `Bearer ${ownerTokenB}`) // tenantB nao tem nenhum modulo pago
      .send({
        name: 'Gerente Sem Modulo',
        email: 'gerente@staff-b.test',
        password: 'senha12345',
        phone: '(11) 90000-0000',
        permissions: ['financeiro'],
      })
      .expect(400);
  });

  it('funcionario SEM a permissao "financeiro" recebe 403 em /financial/expenses mesmo com o modulo contratado', async () => {
    const staff = await createStaffMember(ownerTokenA, {
      email: 'sem-financeiro@staff-a.test',
      password: 'senha12345',
      permissions: ['pedidos'],
    });
    const staffToken = await loginAs({ ...tenantA, email: staff.email, password: 'senha12345' });

    await request(app.getHttpServer())
      .get('/v1/financial/expenses')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('funcionario COM a permissao "financeiro" acessa /financial/expenses normalmente', async () => {
    const staff = await createStaffMember(ownerTokenA, {
      email: 'com-financeiro@staff-a.test',
      password: 'senha12345',
      permissions: ['financeiro'],
    });
    const staffToken = await loginAs({ ...tenantA, email: staff.email, password: 'senha12345' });

    await request(app.getHttpServer())
      .get('/v1/financial/expenses')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
  });

  it('dono (tenant_owner) sempre acessa /financial/expenses, independente de "permissions"', async () => {
    await request(app.getHttpServer())
      .get('/v1/financial/expenses')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .expect(200);
  });

  it('desativar funcionario: login passa a falhar e audit log grava user.status_change', async () => {
    const staff = await createStaffMember(ownerTokenA, { email: 'desativar@staff-a.test', password: 'senha12345' });

    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: staff.email, password: 'senha12345', tenantSlug: tenantA.tenantSlug })
      .expect(200);
    const refreshCookie = extractCookieValue(loginRes, REFRESH_COOKIE_NAME);

    await request(app.getHttpServer())
      .patch(`/v1/tenants/me/staff/${staff.id}`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({ active: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: staff.email, password: 'senha12345', tenantSlug: tenantA.tenantSlug })
      .expect(403);

    // Decisao 4: desativar revoga TODAS as sessoes -- o refresh token emitido ANTES da
    // desativacao tambem para de funcionar (nao so' um novo login).
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${refreshCookie}`)
      .expect(401);

    const logs = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.auditLog.findMany({ where: { targetId: staff.id, action: 'user.status_change' } }),
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].metadata).toEqual({ from: true, to: false });
  });

  it('reativar funcionario: login volta a funcionar', async () => {
    const staff = await createStaffMember(ownerTokenA, { email: 'reativar@staff-a.test', password: 'senha12345' });

    await request(app.getHttpServer())
      .patch(`/v1/tenants/me/staff/${staff.id}`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({ active: false })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/v1/tenants/me/staff/${staff.id}`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({ active: true })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: staff.email, password: 'senha12345', tenantSlug: tenantA.tenantSlug })
      .expect(200);
  });

  it('audit log grava user.create na criacao do funcionario', async () => {
    const staff = await createStaffMember(ownerTokenA, { email: 'auditoria-create@staff-a.test' });
    const logs = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.auditLog.findMany({ where: { targetId: staff.id, action: 'user.create' } }),
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].actorEmail).toBe(tenantA.email);
  });
});
