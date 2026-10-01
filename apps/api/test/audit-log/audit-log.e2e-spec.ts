import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CepLookupService } from '../../src/common/cep-lookup.service';
import { hashPassword } from '../../src/common/password.util';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupCategory, cleanupProduct, seedCategory, seedProduct, SeededCategory, SeededProduct } from '../utils/seed-catalog';
import { cleanupSuperAdmin, cleanupTenantWithUser, seedSuperAdmin, seedTenantWithUser, SeededSuperAdmin, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupPlan, seedPlan, SeededPlan } from '../utils/seed-subscription';

const VALID_CEP = '01310-100';

// Sprint 15, parte 3 -- prova que cada acao do vocabulario fechado grava uma linha
// correta em audit_logs, e que nenhum caminho grava a senha tentada em login falho.
describe('Audit log append-only', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenant: SeededTenantUser;
  let category: SeededCategory;
  let product: SeededProduct;
  let customer: { id: string; email: string; password: string };
  let ownerToken: string;
  let customerToken: string;
  let createdOrderId: string;

  beforeAll(async () => {
    const cepLookupMock = jest.fn().mockResolvedValue({ address: 'Rua Teste', neighborhood: 'Centro', city: 'Sao Paulo', state: 'SP' });
    app = await createTestApp((builder) => builder.overrideProvider(CepLookupService).useValue({ resolve: cepLookupMock }));
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    tenant = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'audit', role: 'tenant_owner' });
    category = await seedCategory(tenantContext, tenant.tenantId, 'Categoria Audit');
    product = await seedProduct(tenantContext, tenant.tenantId, category.id, { name: 'Pizza Audit', priceOitoPedacos: 40, type: 'pizza' });

    const customerPassword = randomUUID();
    const customerPasswordHash = await hashPassword(customerPassword);
    const customerUser = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.user.create({
        data: { tenantId: tenant.tenantId, email: `audit-customer@${tenant.tenantSlug}.test`, name: 'Cliente Audit', role: 'customer', passwordHash: customerPasswordHash },
      }),
    );
    customer = { id: customerUser.id, email: customerUser.email, password: customerPassword };

    const ownerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenant.email, password: tenant.password, tenantSlug: tenant.tenantSlug })
      .expect(200);
    ownerToken = ownerLogin.body.accessToken;

    const customerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: customer.email, password: customer.password, tenantSlug: tenant.tenantSlug })
      .expect(200);
    customerToken = customerLogin.body.accessToken;
  });

  afterAll(async () => {
    if (createdOrderId) {
      await tenantContext
        .runInTenantContext(tenant.tenantId, async (tx) => {
          await tx.orderItem.deleteMany({ where: { orderId: createdOrderId } });
          await tx.order.delete({ where: { id: createdOrderId } });
        })
        .catch(() => undefined);
    }
    await cleanupProduct(tenantContext, tenant.tenantId, product.id);
    await cleanupCategory(tenantContext, tenant.tenantId, category.id);
    await cleanupTenantWithUser(prisma, tenantContext, tenant);
    await app.close();
  });

  it("login bem-sucedido grava 'auth.login' com o ator correto", async () => {
    const logs = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.auditLog.findMany({ where: { action: 'auth.login', actorId: customer.id } }),
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].actorEmail).toBe(customer.email);
    expect(logs[0].actorRole).toBe('customer');
    expect(logs[0].tenantId).toBe(tenant.tenantId);
  });

  it("login com senha errada grava 'auth.login_failed' e NUNCA a senha, em nenhum campo", async () => {
    const wrongPassword = 'senha-errada-123456'; // gitleaks:allow -- senha FALSA de teste, nunca usada de verdade, so' pra confirmar que ela nunca e' gravada no audit log
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: customer.email, password: wrongPassword, tenantSlug: tenant.tenantSlug })
      .expect(401);

    const logs = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.auditLog.findMany({ where: { action: 'auth.login_failed', actorEmail: customer.email } }),
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const entry = logs[logs.length - 1];
    expect(entry.actorId).toBeNull();
    expect(entry.actorRole).toBe('unknown');
    // Nenhum campo do registro, nem metadata, pode conter a senha tentada.
    expect(JSON.stringify(entry)).not.toContain(wrongPassword);
  });

  it("login com tenantSlug inexistente grava 'auth.login_failed' com tenantId null (evento de plataforma)", async () => {
    const unknownSlug = `inexistente-${randomUUID().slice(0, 8)}`;
    const attemptedEmail = `fantasma-${randomUUID().slice(0, 8)}@teste.test`;
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: attemptedEmail, password: 'qualquer-coisa', tenantSlug: unknownSlug })
      .expect(401);

    const entry = await prisma.auditLog.findFirst({ where: { action: 'auth.login_failed', actorEmail: attemptedEmail, tenantId: null } });
    expect(entry).not.toBeNull();
    expect((entry!.metadata as { tenantSlug: string }).tenantSlug).toBe(unknownSlug);

    await prisma.auditLog.delete({ where: { id: entry!.id } });
  });

  it("cadastro de cliente grava 'user.create' com o proprio cadastrado como ator", async () => {
    const newEmail = `novo-cliente-${randomUUID().slice(0, 8)}@${tenant.tenantSlug}.test`;
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Novo Cliente', email: newEmail, password: 'senha12345', phone: '11999999999', tenantSlug: tenant.tenantSlug })
      .expect(201);
    const newUserId = res.body.user.id as string;

    const entry = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.auditLog.findFirst({ where: { action: 'user.create', targetId: newUserId } }),
    );
    expect(entry).not.toBeNull();
    expect(entry!.actorId).toBe(newUserId);
    expect(entry!.actorEmail).toBe(newEmail);
    expect(entry!.targetType).toBe('user');

    // register() emite tokens (refresh_tokens_user_id_fkey) -- apagar antes do usuario,
    // mesma ordem ja estabelecida em cleanupTenantWithUser.
    await tenantContext.runInTenantContext(tenant.tenantId, async (tx) => {
      await tx.auditLog.deleteMany({ where: { actorId: newUserId } });
      await tx.refreshToken.deleteMany({ where: { userId: newUserId } });
      await tx.user.delete({ where: { id: newUserId } });
    });
  });

  it("mudanca de status de pedido grava 'order.status_change' com from/to corretos", async () => {
    const orderRes = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [{ productId: product.id, size: 'oito-pedacos', quantity: 1 }],
        phone: '11999999999',
        address: 'Rua Teste',
        addressNumber: '100',
        paymentMethod: 'dinheiro',
        cep: VALID_CEP,
      })
      .expect(201);
    createdOrderId = orderRes.body.id;

    await request(app.getHttpServer())
      .patch(`/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'preparing' })
      .expect(200);

    const entry = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.auditLog.findFirst({ where: { action: 'order.status_change', targetId: createdOrderId } }),
    );
    expect(entry).not.toBeNull();
    expect(entry!.actorId).toBe(tenant.userId);
    expect(entry!.metadata).toEqual({ from: 'pending', to: 'preparing' });
  });

  it("alternar a loja pra fechada grava 'tenant.store_status_change' com from/to corretos", async () => {
    await request(app.getHttpServer())
      .patch('/v1/tenants/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isOpen: false })
      .expect(200);

    const entry = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.auditLog.findFirst({ where: { action: 'tenant.store_status_change' } }),
    );
    expect(entry).not.toBeNull();
    expect(entry!.metadata).toEqual({ from: true, to: false });

    // Reabre pra nao afetar nenhum teste seguinte que dependa da loja aberta.
    await request(app.getHttpServer()).patch('/v1/tenants/me').set('Authorization', `Bearer ${ownerToken}`).send({ isOpen: true }).expect(200);
  });

  it("PATCH em /tenants/me que NAO mexe em isOpen nao gera 'tenant.store_status_change' (sem log fantasma)", async () => {
    const before = await tenantContext.runInTenantContext(tenant.tenantId, (tx) => tx.auditLog.count({ where: { action: 'tenant.store_status_change' } }));

    await request(app.getHttpServer())
      .patch('/v1/tenants/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deliveryFee: 12.5 })
      .expect(200);

    const after = await tenantContext.runInTenantContext(tenant.tenantId, (tx) => tx.auditLog.count({ where: { action: 'tenant.store_status_change' } }));
    expect(after).toBe(before);
  });

  describe('onboarding de tenant novo', () => {
    let superAdmin: SeededSuperAdmin;
    let superAdminToken: string;
    let plan: SeededPlan;
    let onboardedTenantId: string | undefined;
    const slug = `audit-onboard-${randomUUID().slice(0, 8)}`;

    beforeAll(async () => {
      superAdmin = await seedSuperAdmin(prisma);
      const login = await request(app.getHttpServer()).post('/v1/auth/login').send({ email: superAdmin.email, password: superAdmin.password }).expect(200);
      superAdminToken = login.body.accessToken;
      plan = await seedPlan(prisma, { modules: [] });
    });

    afterAll(async () => {
      if (onboardedTenantId) {
        await tenantContext.runInTenantContext(onboardedTenantId, async (tx) => {
          await tx.auditLog.deleteMany({ where: { tenantId: onboardedTenantId } });
          await tx.subscription.deleteMany({ where: { tenantId: onboardedTenantId } });
          await tx.refreshToken.deleteMany({ where: { tenantId: onboardedTenantId } });
          await tx.user.deleteMany({ where: { tenantId: onboardedTenantId } });
        });
        await prisma.tenant.delete({ where: { id: onboardedTenantId } }).catch(() => undefined);
      }
      await cleanupPlan(prisma, plan);
      await cleanupSuperAdmin(prisma, superAdmin);
    });

    it("grava 'tenant.create' e 'user.create' (dono) com o superadmin como ator", async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/admin/tenants/onboard')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Pizza Audit Onboard',
          slug,
          ownerName: 'Dono Audit',
          ownerEmail: `dono@${slug}.test`,
          ownerPassword: 'senha12345',
          planId: plan.id,
        })
        .expect(201);
      onboardedTenantId = res.body.tenant.id;
      const ownerId = res.body.owner.id as string;

      const tenantCreateEntry = await tenantContext.runInTenantContext(onboardedTenantId!, (tx) =>
        tx.auditLog.findFirst({ where: { action: 'tenant.create', targetId: onboardedTenantId! } }),
      );
      expect(tenantCreateEntry).not.toBeNull();
      expect(tenantCreateEntry!.actorId).toBe(superAdmin.userId);
      expect(tenantCreateEntry!.actorEmail).toBe(superAdmin.email);
      expect(tenantCreateEntry!.actorRole).toBe('platform_superadmin');

      const userCreateEntry = await tenantContext.runInTenantContext(onboardedTenantId!, (tx) =>
        tx.auditLog.findFirst({ where: { action: 'user.create', targetId: ownerId } }),
      );
      expect(userCreateEntry).not.toBeNull();
      expect(userCreateEntry!.actorId).toBe(superAdmin.userId);
    });
  });
});
