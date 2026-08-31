import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CacheService } from '../../src/cache/cache.service';
import { tenantBrandingCacheKey } from '../../src/common/tenant-branding-cache-key';
import { TenantBrandingResponse } from '../../src/common/tenant-response.util';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupSuperAdmin, seedSuperAdmin, SeededSuperAdmin } from '../utils/seed-auth-fixtures';

// Injeta CacheService direto (app.get) em vez de inferir por timing de resposta -- prova
// de verdade que a chave foi setada/apagada, nao um efeito colateral observado de fora.
// Com Redis real no CI (redis:7), essa suite exercita o RedisCacheService de verdade; em
// dev local sem REDIS_URL, exercita o MemoryCacheService -- mesma suite, sem condicional.
describe('Cache de branding publico (invalidacao ativa)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cache: CacheService;
  let superAdmin: SeededSuperAdmin;
  let superAdminToken: string;
  const slug = `public-cache-${randomUUID().slice(0, 8)}`;
  let tenantId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    cache = app.get(CacheService);

    const tenant = await prisma.tenant.create({
      data: { name: 'Cache Test', slug, primaryColor: '#111111' },
    });
    tenantId = tenant.id;

    superAdmin = await seedSuperAdmin(prisma);
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password })
      .expect(200);
    superAdminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.tenant.delete({ where: { id: tenantId } });
    await cleanupSuperAdmin(prisma, superAdmin);
    await app.close();
  });

  it('primeira leitura popula a chave no cache', async () => {
    expect(await cache.get(tenantBrandingCacheKey(slug))).toBeNull();

    await request(app.getHttpServer()).get(`/v1/public/tenants/${slug}`).expect(200);

    const cached = await cache.get<TenantBrandingResponse>(tenantBrandingCacheKey(slug));
    expect(cached?.primaryColor).toBe('#111111');
  });

  it(
    'PATCH real do superadmin invalida a chave (cache.get retorna null logo depois), e a ' +
      'proxima leitura publica repopula com o valor novo',
    async () => {
      // pre-condicao: a chave esta populada com o valor antigo (teste anterior).
      expect((await cache.get<TenantBrandingResponse>(tenantBrandingCacheKey(slug)))?.primaryColor).toBe('#111111');

      await request(app.getHttpServer())
        .patch(`/v1/admin/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ primaryColor: '#222222' })
        .expect(200);

      // Invalidado pelo proprio handler do PATCH (TenantsAdminService.update), nao por
      // acao manual do teste.
      expect(await cache.get(tenantBrandingCacheKey(slug))).toBeNull();

      const res = await request(app.getHttpServer()).get(`/v1/public/tenants/${slug}`).expect(200);
      expect(res.body.primaryColor).toBe('#222222');

      const repopulated = await cache.get<TenantBrandingResponse>(tenantBrandingCacheKey(slug));
      expect(repopulated?.primaryColor).toBe('#222222');
    },
  );

  it('renomear o slug via PATCH invalida a chave ANTIGA tambem', async () => {
    const newSlug = `${slug}-renamed`;

    await request(app.getHttpServer())
      .patch(`/v1/admin/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ slug: newSlug })
      .expect(200);

    expect(await cache.get(tenantBrandingCacheKey(slug))).toBeNull();
    await request(app.getHttpServer()).get(`/v1/public/tenants/${slug}`).expect(404);

    const res = await request(app.getHttpServer()).get(`/v1/public/tenants/${newSlug}`).expect(200);
    expect(res.body.slug).toBe(newSlug);
  });
});
