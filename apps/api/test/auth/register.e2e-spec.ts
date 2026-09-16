import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';

// Primeiro teste e2e a exercitar POST /v1/auth/register (Sprint 13 -- gap ja
// identificado no detalhamento da Sprint 14; se ela for implementada depois, estende
// este arquivo em vez de criar um novo).
describe('POST /v1/auth/register', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantId: string;
  let tenantSlug: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);
    tenantSlug = `reg-${randomUUID().slice(0, 8)}`;
    const tenant = await prisma.tenant.create({ data: { name: tenantSlug, slug: tenantSlug } });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await tenantContext.runInTenantContext(tenantId, async (tx) => {
      await tx.refreshToken.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
    });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  it('registro sem phone retorna 400 (campo obrigatorio desde a Sprint 13)', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Cliente Sem Fone', email: `sem-fone@${tenantSlug}.test`, password: 'Teste@1234' })
      .expect(400);
  });

  it('registro com phone cria o usuario e persiste o telefone', async () => {
    const email = `com-fone@${tenantSlug}.test`;
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Cliente Com Fone', email, password: 'Teste@1234', phone: '11999998888' })
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();

    const me = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(me.body.phone).toBe('11999998888');
  });

  it('email duplicado no mesmo tenant retorna 409', async () => {
    const email = `duplicado@${tenantSlug}.test`;
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Primeiro', email, password: 'Teste@1234', phone: '11999998888' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Segundo', email, password: 'Teste@1234', phone: '11999998888' })
      .expect(409);
  });

  it('endereco opcional no cadastro: register + PATCH /users/me (mesmo fluxo do updateProfile do frontend) persiste o perfil', async () => {
    const email = `com-endereco@${tenantSlug}.test`;
    const registerRes = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Cliente Com Endereco', email, password: 'Teste@1234', phone: '11999998888' })
      .expect(201);
    const token = registerRes.body.accessToken;

    // Sem "cep" no body de proposito -- nao precisa mockar CepLookupService aqui
    // (ja coberto na Sprint 12), so' confirma que o endereco digitado sem CEP tambem
    // persiste (endereco continua opcional/livre, mesmo comportamento de updateMe).
    await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: 'Rua Cadastro', addressNumber: '10', neighborhood: 'Centro' })
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body.address).toBe('Rua Cadastro');
    expect(me.body.addressNumber).toBe('10');
    expect(me.body.neighborhood).toBe('Centro');
  });
});
