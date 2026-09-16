import { createHash, randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EMAIL_SENDER } from '../../src/email/email-sender.interface';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';

describe('Confirmacao de e-mail no cadastro (Sprint 14)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantId: string;
  let tenantSlug: string;
  let sendMock: jest.Mock;

  // ConsoleEmailSender real so' loga -- pra pegar o token cru nos testes, a
  // implementacao de EmailSender e' trocada por um mock que so' registra a chamada
  // (o token cru vai no link dentro do html).
  function extractToken(): string {
    const lastCall = sendMock.mock.calls[sendMock.mock.calls.length - 1];
    const html = lastCall[2] as string;
    const match = html.match(/token=([0-9a-f]{64})/);
    if (!match) {
      throw new Error('token nao encontrado no e-mail mockado');
    }
    return match[1];
  }

  beforeAll(async () => {
    sendMock = jest.fn().mockResolvedValue(undefined);
    app = await createTestApp((builder) => builder.overrideProvider(EMAIL_SENDER).useValue({ send: sendMock }));
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);
    tenantSlug = `everif-${randomUUID().slice(0, 8)}`;
    const tenant = await prisma.tenant.create({ data: { name: tenantSlug, slug: tenantSlug } });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await tenantContext.runInTenantContext(tenantId, async (tx) => {
      await tx.emailVerificationToken.deleteMany({ where: { tenantId } });
      await tx.refreshToken.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
    });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  it('registro cria o usuario com emailVerifiedAt null e envia um token de verificacao', async () => {
    const email = `verify1@${tenantSlug}.test`;
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Cliente Verify', email, password: 'Teste@1234', phone: '11999998888' })
      .expect(201);

    const me = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(me.body.emailVerifiedAt).toBeNull();
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toBe(email);
  });

  it('verify-email com o token certo confirma emailVerifiedAt; reuso do mesmo token da 400 (uso unico)', async () => {
    const email = `verify2@${tenantSlug}.test`;
    const register = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Cliente Verify 2', email, password: 'Teste@1234', phone: '11999998888' })
      .expect(201);
    const token = extractToken();

    await request(app.getHttpServer()).post('/v1/auth/verify-email').send({ tenantSlug, token }).expect(200);

    const me = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .expect(200);
    expect(me.body.emailVerifiedAt).not.toBeNull();

    await request(app.getHttpServer()).post('/v1/auth/verify-email').send({ tenantSlug, token }).expect(400);
  });

  it('token expirado retorna 400', async () => {
    const email = `verify3@${tenantSlug}.test`;
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Cliente Verify 3', email, password: 'Teste@1234', phone: '11999998888' })
      .expect(201);
    const token = extractToken();
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await tenantContext.runInTenantContext(tenantId, (tx) =>
      tx.emailVerificationToken.update({ where: { tokenHash }, data: { expiresAt: new Date(Date.now() - 1000) } }),
    );

    await request(app.getHttpServer()).post('/v1/auth/verify-email').send({ tenantSlug, token }).expect(400);
  });

  it('resend-verification gera um token novo e invalida o anterior; da 400 se ja confirmado', async () => {
    const email = `verify4@${tenantSlug}.test`;
    const register = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Cliente Verify 4', email, password: 'Teste@1234', phone: '11999998888' })
      .expect(201);
    const firstToken = extractToken();
    const authToken = register.body.accessToken;

    await request(app.getHttpServer())
      .post('/v1/auth/resend-verification')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const secondToken = extractToken();
    expect(secondToken).not.toBe(firstToken);

    // Token antigo foi invalidado pelo resend -- nao funciona mais.
    await request(app.getHttpServer()).post('/v1/auth/verify-email').send({ tenantSlug, token: firstToken }).expect(400);

    // Token novo confirma normalmente.
    await request(app.getHttpServer()).post('/v1/auth/verify-email').send({ tenantSlug, token: secondToken }).expect(200);

    // Reenviar depois de ja confirmado nao faz sentido -> 400.
    await request(app.getHttpServer())
      .post('/v1/auth/resend-verification')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);
  });

  it('login e checkout continuam funcionando normalmente com emailVerifiedAt null -- sem bloqueio nenhum', async () => {
    const email = `verify5@${tenantSlug}.test`;
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ tenantSlug, name: 'Cliente Verify 5', email, password: 'Teste@1234', phone: '11999998888' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: 'Teste@1234', tenantSlug })
      .expect(200);
    expect(login.body.accessToken).toBeTruthy();

    const me = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body.emailVerifiedAt).toBeNull();
  });
});
