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

describe('POST /v1/auth/logout', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let user: SeededTenantUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);
    user = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'logout', role: 'tenant_owner' });
  });

  afterAll(async () => {
    await cleanupTenantWithUser(prisma, tenantContext, user);
    await app.close();
  });

  // Diferente do Barberaria (so limpa cookie no cliente): logout aqui revoga no banco —
  // e' o motivo real de ter escolhido refresh token com tabela em vez de stateless.
  it('revoga a familia no banco, nao so limpa o cookie', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: user.password, tenantSlug: user.tenantSlug })
      .expect(200);
    const rawRefreshToken = extractRefreshCookie(loginRes);

    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${rawRefreshToken}`)
      .expect(200);

    // Reenvia o MESMO cookie manualmente (nao dependendo do clearCookie do lado cliente)
    // pra provar que a revogacao e' server-side.
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${rawRefreshToken}`)
      .expect(401);

    const rows = await tenantContext.runInTenantContext(user.tenantId, (tx) =>
      tx.refreshToken.findMany({ where: { userId: user.userId } }),
    );
    expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
  });
});
