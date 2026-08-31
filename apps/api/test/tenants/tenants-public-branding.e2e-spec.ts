import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';

describe('GET /v1/public/tenants/:slug', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const slug = `public-branding-${randomUUID().slice(0, 8)}`;
  let tenantId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const tenant = await prisma.tenant.create({
      data: { name: 'Public Branding Test', slug, primaryColor: '#ABCDEF', phone: '11988887777' },
    });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  it('slug desconhecido retorna 404', async () => {
    await request(app.getHttpServer()).get('/v1/public/tenants/slug-que-nao-existe').expect(404);
  });

  it('funciona sem nenhum header Authorization (prova que nao ha' + ' guard)', async () => {
    const res = await request(app.getHttpServer()).get(`/v1/public/tenants/${slug}`);
    expect(res.status).toBe(200);
  });

  it('resposta e' + ' exatamente {name,slug,primaryColor,logo} — sem campos internos', async () => {
    const res = await request(app.getHttpServer()).get(`/v1/public/tenants/${slug}`).expect(200);

    expect(res.body).toEqual({
      name: 'Public Branding Test',
      slug,
      primaryColor: '#ABCDEF',
      logo: '🍕',
    });
    expect(res.body).not.toHaveProperty('active');
    expect(res.body).not.toHaveProperty('phone');
    expect(res.body).not.toHaveProperty('address');
    expect(res.body).not.toHaveProperty('deliveryFee');
    expect(res.body).not.toHaveProperty('minOrder');
    expect(res.body).not.toHaveProperty('id');
  });
});
