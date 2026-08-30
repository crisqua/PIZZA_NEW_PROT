import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { extractCookieValue } from '../utils/cookies';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? 'pizza_refresh';

function extractRefreshCookie(res: request.Response): string {
  return extractCookieValue(res, REFRESH_COOKIE_NAME);
}

// So decodifica o payload (nao verifica assinatura) — suficiente pra ler familyId em teste.
function decodeFamilyId(rawJwt: string): string {
  const payload = JSON.parse(Buffer.from(rawJwt.split('.')[1], 'base64url').toString('utf8'));
  return payload.familyId;
}

describe('POST /v1/auth/refresh', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let user: SeededTenantUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);
    user = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'refresh', role: 'tenant_owner' });
  });

  afterAll(async () => {
    await cleanupTenantWithUser(prisma, tenantContext, user);
    await app.close();
  });

  async function login() {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: user.password, tenantSlug: user.tenantSlug })
      .expect(200);
    return extractRefreshCookie(res);
  }

  it('rotaciona e o novo access token funciona numa rota protegida real', async () => {
    const rawRefreshToken = await login();

    const refreshRes = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${rawRefreshToken}`)
      .expect(200);

    const newAccessToken = refreshRes.body.accessToken;
    await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);
  });

  it('sem cookie retorna 401', async () => {
    await request(app.getHttpServer()).post('/v1/auth/refresh').expect(401);
  });

  it('reuso de um token ja consumido e detectado como roubo e revoga a familia inteira', async () => {
    const originalRefreshToken = await login();

    const firstRefresh = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${originalRefreshToken}`)
      .expect(200);
    const rotatedRefreshToken = extractRefreshCookie(firstRefresh);

    // Replay do token original (ja consumido pela rotacao acima) -> reuso.
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${originalRefreshToken}`)
      .expect(401);

    // O token novo (fruto da rotacao) tambem deve estar revogado — a familia inteira caiu.
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${rotatedRefreshToken}`)
      .expect(401);

    // Escopado a familyId (nao a userId): o usuario e' reaproveitado entre os testes deste
    // arquivo, entao outras familias (de outros logins neste describe) podem legitimamente
    // seguir ativas — a invariante aqui e' so' sobre a familia desta reutilizacao.
    const familyId = decodeFamilyId(originalRefreshToken);
    const familyTokens = await tenantContext.runInTenantContext(user.tenantId, (tx) =>
      tx.refreshToken.findMany({ where: { familyId } }),
    );
    expect(familyTokens.every((t) => t.revokedAt !== null)).toBe(true);
  });

  it('token expirado no banco (mas assinatura ainda valida) retorna 401 sem revogar a familia', async () => {
    const rawRefreshToken = await login();

    const [tokenRow] = await tenantContext.runInTenantContext(user.tenantId, (tx) =>
      tx.refreshToken.findMany({ where: { userId: user.userId }, orderBy: { createdAt: 'desc' }, take: 1 }),
    );
    await tenantContext.runInTenantContext(user.tenantId, (tx) =>
      tx.refreshToken.update({ where: { id: tokenRow.id }, data: { expiresAt: new Date(Date.now() - 1000) } }),
    );

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${rawRefreshToken}`)
      .expect(401);

    const reloaded = await tenantContext.runInTenantContext(user.tenantId, (tx) =>
      tx.refreshToken.findUnique({ where: { id: tokenRow.id } }),
    );
    expect(reloaded?.revokedAt).toBeNull();
  });
});
