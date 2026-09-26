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
      // cnpj preenchido de proposito -- prova que o campo fica de fora mesmo quando
      // EXISTE, nao so' porque nunca foi setado (teste mais forte que so' ausencia).
      data: { name: 'Public Branding Test', slug, primaryColor: '#ABCDEF', phone: '11988887777', cnpj: '11222333000181' },
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

  // deliveryFee/minOrder entraram na Sprint 7 (ver tenant-response.util.ts): diferente de
  // active/phone/address/id (dado operacional/interno, continua fora), sao preco pro
  // cliente -- apps/cliente precisa deles pra montar o total do carrinho antes do checkout.
  // isOpen/openingTime/closingTime/openWeekends/estimatedDeliveryMinutes (Sprint 27)
  // entram pelo mesmo motivo: sao pra aparecer pro cliente final, e' o proprio
  // propósito deles (Menu.tsx mostra Aberto/Fechado e bloqueia pedido quando fechado).
  it('resposta e' + ' exatamente os campos publicos esperados — sem campos internos', async () => {
    const res = await request(app.getHttpServer()).get(`/v1/public/tenants/${slug}`).expect(200);

    expect(res.body).toEqual({
      name: 'Public Branding Test',
      slug,
      primaryColor: '#ABCDEF',
      logo: '🍕',
      deliveryFee: 0,
      minOrder: 0,
      isOpen: true,
      openingTime: null,
      closingTime: null,
      openWeekends: true,
      estimatedDeliveryMinutes: null,
    });
    expect(res.body).not.toHaveProperty('active');
    expect(res.body).not.toHaveProperty('phone');
    expect(res.body).not.toHaveProperty('address');
    expect(res.body).not.toHaveProperty('id');
    // CNPJ e' dado interno/legal (mesma regua de phone/address) -- nunca exposto aqui,
    // mesmo o tenant tendo um cadastrado (ver beforeAll).
    expect(res.body).not.toHaveProperty('cnpj');
  });

  it('loja fechada com horario customizado aparece de verdade na resposta publica (Sprint 27)', async () => {
    const closedSlug = `public-branding-closed-${randomUUID().slice(0, 8)}`;
    const closedTenant = await prisma.tenant.create({
      data: {
        name: 'Fechada Test',
        slug: closedSlug,
        isOpen: false,
        openingTime: '18:00',
        closingTime: '23:30',
        openWeekends: false,
        estimatedDeliveryMinutes: 45,
      },
    });
    try {
      const res = await request(app.getHttpServer()).get(`/v1/public/tenants/${closedSlug}`).expect(200);
      expect(res.body.isOpen).toBe(false);
      expect(res.body.openingTime).toBe('18:00');
      expect(res.body.closingTime).toBe('23:30');
      expect(res.body.openWeekends).toBe(false);
      expect(res.body.estimatedDeliveryMinutes).toBe(45);
    } finally {
      await prisma.tenant.delete({ where: { id: closedTenant.id } });
    }
  });
});
