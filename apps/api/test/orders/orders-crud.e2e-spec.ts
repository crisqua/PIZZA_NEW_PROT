import { randomUUID } from 'crypto';
import { BadRequestException, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CepLookupService } from '../../src/common/cep-lookup.service';
import { hashPassword } from '../../src/common/password.util';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupCategory, cleanupProduct, seedCategory, seedProduct, SeededCategory, SeededProduct } from '../utils/seed-catalog';

// CEP valido usado em todo payload de pedido (Sprint 12: cep virou obrigatorio no DTO) --
// nao bate no ViaCEP de verdade, CepLookupService e' mockado abaixo (cepLookupMock).
const VALID_CEP = '01310-100';

describe('/v1/orders', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let cepLookupMock: jest.Mock;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;
  let customerA: { id: string; email: string; password: string };
  let categoryA: SeededCategory;
  let categoryB: SeededCategory;
  let pizzaA1: SeededProduct;
  let pizzaA2: SeededProduct;
  let drinkA: SeededProduct;
  let productB: SeededProduct;
  let ownerToken: string;
  let customerToken: string;
  let createdOrderId: string;

  beforeAll(async () => {
    cepLookupMock = jest.fn().mockResolvedValue({ address: 'Rua Teste', neighborhood: 'Centro', city: 'Sao Paulo', state: 'SP' });
    app = await createTestApp((builder) =>
      builder.overrideProvider(CepLookupService).useValue({ resolve: cepLookupMock }),
    );
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'ord-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'ord-b', role: 'tenant_owner' });

    const customerPassword = randomUUID();
    const customerPasswordHash = await hashPassword(customerPassword);
    const customerUser = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.user.create({
        data: {
          tenantId: tenantA.tenantId,
          email: `customer@${tenantA.tenantSlug}.test`,
          name: 'Cliente A',
          role: 'customer',
          passwordHash: customerPasswordHash,
        },
      }),
    );
    customerA = { id: customerUser.id, email: customerUser.email, password: customerPassword };

    categoryA = await seedCategory(tenantContext, tenantA.tenantId, 'Categoria A');
    categoryB = await seedCategory(tenantContext, tenantB.tenantId, 'Categoria B');
    pizzaA1 = await seedProduct(tenantContext, tenantA.tenantId, categoryA.id, { name: 'Marguerita', priceOitoPedacos: 40, type: 'pizza' });
    pizzaA2 = await seedProduct(tenantContext, tenantA.tenantId, categoryA.id, { name: 'Calabresa', priceOitoPedacos: 44, type: 'pizza' });
    drinkA = await seedProduct(tenantContext, tenantA.tenantId, categoryA.id, { name: 'Refrigerante', price: 8, type: 'drink' });
    productB = await seedProduct(tenantContext, tenantB.tenantId, categoryB.id, { name: 'Produto B', type: 'pizza' });

    const ownerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantA.email, password: tenantA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    ownerToken = ownerLogin.body.accessToken;

    const customerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: customerA.email, password: customerA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    customerToken = customerLogin.body.accessToken;
  });

  afterAll(async () => {
    if (createdOrderId) {
      await tenantContext
        .runInTenantContext(tenantA.tenantId, async (tx) => {
          await tx.orderItem.deleteMany({ where: { orderId: createdOrderId } });
          await tx.order.delete({ where: { id: createdOrderId } });
        })
        .catch(() => undefined);
    }
    await tenantContext.runInTenantContext(tenantA.tenantId, (tx) => tx.order.deleteMany({ where: { tenantId: tenantA.tenantId } }));
    await cleanupProduct(tenantContext, tenantA.tenantId, pizzaA1.id);
    await cleanupProduct(tenantContext, tenantA.tenantId, pizzaA2.id);
    await cleanupProduct(tenantContext, tenantA.tenantId, drinkA.id);
    await cleanupProduct(tenantContext, tenantB.tenantId, productB.id);
    await cleanupCategory(tenantContext, tenantA.tenantId, categoryA.id);
    await cleanupCategory(tenantContext, tenantB.tenantId, categoryB.id);
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await app.close();
  });

  it('401 sem token', async () => {
    await request(app.getHttpServer()).get('/v1/orders').expect(401);
    await request(app.getHttpServer()).post('/v1/orders').set('Idempotency-Key', randomUUID()).send({}).expect(401);
  });

  it('400 sem header Idempotency-Key', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: pizzaA1.id, size: 'oito-pedacos' }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(400);
  });

  it('staff (tenant_owner) nao pode criar pedido (403) -- so customer', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: pizzaA1.id, size: 'oito-pedacos' }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(403);
  });

  it('pizza sem size retorna 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: pizzaA1.id }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(400);
  });

  it('bebida com secondProductId retorna 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [{ productId: drinkA.id, secondProductId: pizzaA1.id, quantity: 1 }],
        phone: '119999',
        address: 'Rua X',
        paymentMethod: 'dinheiro',
        cep: VALID_CEP,
      })
      .expect(400);
  });

  it('productId de outro tenant retorna 404 (isolamento cross-tenant -- arquitetura secao 3.2 item 5)', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: productB.id, size: 'oito-pedacos' }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(404);
  });

  it('cria pedido meio a meio + bebida, preco calculado no servidor (nunca confia no client)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [
          { productId: pizzaA1.id, secondProductId: pizzaA2.id, size: 'oito-pedacos', quantity: 1 },
          { productId: drinkA.id, quantity: 2 },
        ],
        phone: '11999998888',
        address: 'Rua Teste',
        addressNumber: '100',
        neighborhood: 'Centro',
        paymentMethod: 'dinheiro',
        cep: VALID_CEP,
      })
      .expect(201);

    createdOrderId = res.body.id;
    expect(res.body.status).toBe('pending');
    expect(res.body.customerName).toBe('Cliente A');
    expect(res.body.city).toBe('Sao Paulo');
    expect(res.body.state).toBe('SP');
    // ViaCEP mockado resolve "Rua Teste" -- confirma que o backend usa o resultado do
    // lookup como fonte da verdade pro logradouro (Sprint 12, decisao 2), nao o que o
    // cliente mandou (que aqui coincide, mas o proximo teste ("bairro forjado") prova
    // isso de verdade).
    expect(res.body.address).toBe('Rua Teste');
    // (40+44)/2 = 42 -- media dos precos-por-tamanho de cada sabor (sem multiplicador,
    // revertido nesta sprint), nunca confiado do client, calculado em OrdersService.
    expect(res.body.items[0].unitPrice).toBe(42);
    expect(res.body.items[0].name).toBe('Marguerita + Calabresa');
    expect(res.body.items[1].unitPrice).toBe(8);
    expect(res.body.total).toBe(42 + 8 * 2);
    expect(typeof res.body.total).toBe('number');
    // Codigo sequencial "AAAAMMDDNNNN" (fuso America/Sao_Paulo) -- tenantA e' seedado do
    // zero neste describe, entao o primeiro pedido dele sempre comeca em "...0001".
    expect(res.body.orderCode).toMatch(/^\d{8}0001$/);
  });

  it('CEP mal formatado retorna 400 (letras / tamanho errado)', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: drinkA.id, quantity: 1 }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro', cep: '123' })
      .expect(400);
  });

  it('CEP inexistente (ViaCEP responde {erro:true}) retorna 400', async () => {
    cepLookupMock.mockRejectedValueOnce(new BadRequestException('CEP nao encontrado.'));
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: drinkA.id, quantity: 1 }], phone: '119999', address: 'Rua X', paymentMethod: 'dinheiro', cep: '00000-000' })
      .expect(400);
  });

  it('ViaCEP fora do ar (fail-open): pedido ainda e criado com o endereco que o cliente mandou', async () => {
    cepLookupMock.mockResolvedValueOnce(null);
    const res = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [{ productId: drinkA.id, quantity: 1 }],
        phone: '119999',
        address: 'Rua Informada Pelo Cliente',
        neighborhood: 'Bairro Informado',
        city: 'Cidade Informada',
        state: 'CI',
        paymentMethod: 'dinheiro',
        cep: VALID_CEP,
      })
      .expect(201);

    expect(res.body.address).toBe('Rua Informada Pelo Cliente');
    expect(res.body.neighborhood).toBe('Bairro Informado');
    expect(res.body.city).toBe('Cidade Informada');
    expect(res.body.state).toBe('CI');

    await tenantContext.runInTenantContext(tenantA.tenantId, async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: res.body.id } });
      await tx.order.delete({ where: { id: res.body.id } });
    });
  });

  it('CEP valido com bairro forjado no body: backend sobrescreve com o que o ViaCEP resolveu', async () => {
    cepLookupMock.mockResolvedValueOnce({ address: 'Rua Verdadeira', neighborhood: 'Bairro Verdadeiro', city: 'Cidade Verdadeira', state: 'CV' });
    const res = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [{ productId: drinkA.id, quantity: 1 }],
        phone: '119999',
        address: 'Rua Forjada Pelo Cliente',
        neighborhood: 'Bairro Forjado',
        paymentMethod: 'dinheiro',
        cep: VALID_CEP,
      })
      .expect(201);

    expect(res.body.address).toBe('Rua Verdadeira');
    expect(res.body.neighborhood).toBe('Bairro Verdadeiro');
    expect(res.body.city).toBe('Cidade Verdadeira');
    expect(res.body.state).toBe('CV');

    await tenantContext.runInTenantContext(tenantA.tenantId, async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: res.body.id } });
      await tx.order.delete({ where: { id: res.body.id } });
    });
  });

  it('segundo pedido do mesmo tenant no mesmo dia recebe o proximo numero sequencial', async () => {
    const first = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: drinkA.id, quantity: 1 }], phone: '11999998888', address: 'Rua Teste', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: drinkA.id, quantity: 1 }], phone: '11999998888', address: 'Rua Teste', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(201);

    const firstSeq = Number(first.body.orderCode.slice(-4));
    const secondSeq = Number(second.body.orderCode.slice(-4));
    expect(secondSeq).toBe(firstSeq + 1);
    expect(first.body.orderCode.slice(0, 8)).toBe(second.body.orderCode.slice(0, 8));

    await tenantContext.runInTenantContext(tenantA.tenantId, async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: { in: [first.body.id, second.body.id] } } });
      await tx.order.deleteMany({ where: { id: { in: [first.body.id, second.body.id] } } });
    });
  });

  it('tenants diferentes tem sequencias independentes -- os dois comecam em "...0001" no mesmo dia', async () => {
    const customerBPassword = randomUUID();
    const customerBPasswordHash = await hashPassword(customerBPassword);
    const customerBUser = await tenantContext.runInTenantContext(tenantB.tenantId, (tx) =>
      tx.user.create({
        data: {
          tenantId: tenantB.tenantId,
          email: `customer@${tenantB.tenantSlug}.test`,
          name: 'Cliente B',
          role: 'customer',
          passwordHash: customerBPasswordHash,
        },
      }),
    );
    const loginB = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: customerBUser.email, password: customerBPassword, tenantSlug: tenantB.tenantSlug })
      .expect(200);

    const orderB = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${loginB.body.accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: productB.id, size: 'oito-pedacos' }], phone: '119999', address: 'Rua Y', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(201);

    // tenantB nunca criou pedido antes neste describe -- sequencia propria, independente
    // da de tenantA (que ja esta em "...0003" a esta altura), tambem comeca em "...0001".
    expect(orderB.body.orderCode).toMatch(/^\d{8}0001$/);

    await tenantContext.runInTenantContext(tenantB.tenantId, async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: orderB.body.id } });
      await tx.order.delete({ where: { id: orderB.body.id } });
      // refresh_tokens antes de user -- mesma ordem de FK ja documentada (deletar User
      // antes do proprio RefreshToken viola refresh_tokens_user_id_fkey).
      await tx.refreshToken.deleteMany({ where: { userId: customerBUser.id } });
      await tx.user.delete({ where: { id: customerBUser.id } });
    });
  });

  it('GET :id -- dono ve (200), outro cliente nao (404)', async () => {
    await request(app.getHttpServer())
      .get(`/v1/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const otherCustomer = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'ord-cust2', role: 'customer' });
    try {
      const login = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: otherCustomer.email, password: otherCustomer.password, tenantSlug: otherCustomer.tenantSlug })
        .expect(200);
      await request(app.getHttpServer())
        .get(`/v1/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(404);
    } finally {
      await cleanupTenantWithUser(prisma, tenantContext, otherCustomer);
    }
  });

  it('GET lista -- cliente ve so os proprios, staff ve todos do tenant', async () => {
    const customerList = await request(app.getHttpServer())
      .get('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(customerList.body.every((o: { customerId: string }) => o.customerId === customerA.id)).toBe(true);
    expect(customerList.body.some((o: { id: string }) => o.id === createdOrderId)).toBe(true);

    const staffList = await request(app.getHttpServer()).get('/v1/orders').set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(staffList.body.some((o: { id: string }) => o.id === createdOrderId)).toBe(true);
  });

  // Sprint "OrdersPanel sem historico inteiro" (2026-09-22): GET /orders?date= filtra
  // createdAt pro dia inteiro em Sao Paulo. Pedido proprio (nao createdOrderId) pra nao
  // interferir nos testes de maquina de estados abaixo, que dependem de createdOrderId
  // continuar com o status/timing original.
  it('GET com ?date= filtra pro dia (fuso Sao Paulo), sem date mantem o historico completo', async () => {
    const backdated = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: drinkA.id, quantity: 1 }], phone: '119999', address: 'Rua Y', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(201);
    const backdatedId = backdated.body.id;

    try {
      // Chaves de data calculadas no fuso de Sao Paulo (nao Date.now()/toISOString() cru)
      // -- entre 21h e 23h59 em Brasilia o dia UTC ja virou mas o dia em Sao Paulo nao
      // (bug real encontrado rodando este teste: "ontem" calculado como "now - 24h" em
      // UTC caiu no MESMO dia de Sao Paulo que "hoje" nesse horario). "Ontem" e' derivado
      // de todayKey (meio-dia SP de hoje menos 24h), nunca de Date.now() bruto.
      const spDateKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
      const todayKey = spDateKey(new Date());
      const todayNoonSp = new Date(`${todayKey}T12:00:00.000-03:00`);
      const yesterday = new Date(todayNoonSp.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayKey = spDateKey(yesterday);

      await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
        tx.order.update({ where: { id: backdatedId }, data: { createdAt: yesterday } }),
      );

      const todayList = await request(app.getHttpServer())
        .get(`/v1/orders?date=${todayKey}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(todayList.body.some((o: { id: string }) => o.id === backdatedId)).toBe(false);

      const yesterdayList = await request(app.getHttpServer())
        .get(`/v1/orders?date=${yesterdayKey}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(yesterdayList.body.some((o: { id: string }) => o.id === backdatedId)).toBe(true);

      const fullList = await request(app.getHttpServer())
        .get('/v1/orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(fullList.body.some((o: { id: string }) => o.id === backdatedId)).toBe(true);
    } finally {
      await tenantContext.runInTenantContext(tenantA.tenantId, async (tx) => {
        await tx.orderItem.deleteMany({ where: { orderId: backdatedId } });
        await tx.order.delete({ where: { id: backdatedId } });
      });
    }
  });

  it('GET com ?date= em formato invalido retorna 400', async () => {
    await request(app.getHttpServer())
      .get('/v1/orders?date=not-a-date')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  // "from"/"to" (instante ISO exato) -- usado por Dashboard.tsx pro "dia de operacao"
  // que corta as 5h da manha em vez de meia-noite. Testa exatamente esse caso: um
  // pedido as 2h da manha (depois da meia-noite, antes do corte das 5h) precisa contar
  // pro dia anterior quando from/to representam essa janela.
  it('GET com ?from=&to= filtra por instante exato (dia de operacao cruzando meia-noite)', async () => {
    const backdated = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: drinkA.id, quantity: 1 }], phone: '119999', address: 'Rua W', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(201);
    const backdatedId = backdated.body.id;

    try {
      // "Ontem as 2h da manha" -- depois da meia-noite, antes de um corte as 5h.
      const yesterday2am = new Date();
      yesterday2am.setDate(yesterday2am.getDate() - 1);
      yesterday2am.setHours(2, 0, 0, 0);

      await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
        tx.order.update({ where: { id: backdatedId }, data: { createdAt: yesterday2am } }),
      );

      // Janela "dia de operacao de ontem": [ontem 5h, hoje 5h) -- o pedido das 2h de
      // ontem NAO deveria estar aqui (ainda nao passou pelo corte das 5h).
      const cutoffYesterday = new Date();
      cutoffYesterday.setDate(cutoffYesterday.getDate() - 1);
      cutoffYesterday.setHours(5, 0, 0, 0);
      const cutoffToday = new Date(cutoffYesterday.getTime() + 24 * 60 * 60 * 1000);

      const wrongWindow = await request(app.getHttpServer())
        .get(`/v1/orders?from=${cutoffYesterday.toISOString()}&to=${cutoffToday.toISOString()}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(wrongWindow.body.some((o: { id: string }) => o.id === backdatedId)).toBe(false);

      // Janela "dia de operacao de anteontem": [anteontem 5h, ontem 5h) -- o pedido das
      // 2h de ontem PERTENCE a essa janela (ainda e' "a mesma noite" antes do corte).
      const cutoffTwoDaysAgo = new Date(cutoffYesterday.getTime() - 24 * 60 * 60 * 1000);
      const rightWindow = await request(app.getHttpServer())
        .get(`/v1/orders?from=${cutoffTwoDaysAgo.toISOString()}&to=${cutoffYesterday.toISOString()}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(rightWindow.body.some((o: { id: string }) => o.id === backdatedId)).toBe(true);
    } finally {
      await tenantContext.runInTenantContext(tenantA.tenantId, async (tx) => {
        await tx.orderItem.deleteMany({ where: { orderId: backdatedId } });
        await tx.order.delete({ where: { id: backdatedId } });
      });
    }
  });

  it('GET com ?from= em formato invalido retorna 400', async () => {
    await request(app.getHttpServer())
      .get('/v1/orders?from=not-a-date&to=2026-01-01T00:00:00.000Z')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  // "Produtos Mais Vendidos (Mensal)" -- soma no banco (groupBy), so' pedidos completed
  // dos ultimos 30 dias corridos.
  it('GET /orders/top-products soma so pedidos completed dentro dos ultimos 30 dias', async () => {
    const withinWindow = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: drinkA.id, quantity: 2 }], phone: '119999', address: 'Rua Top', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(201);
    // Fora da janela de 30 dias -- quantidade bem maior, se contasse dominaria a soma
    // (prova que realmente foi excluido, nao so' coincidencia de numero pequeno).
    const outsideWindow = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: drinkA.id, quantity: 50 }], phone: '119999', address: 'Rua Top', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(201);
    // Dentro da janela, mas nunca fica completed -- tambem nao deveria contar.
    const neverCompleted = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: drinkA.id, quantity: 30 }], phone: '119999', address: 'Rua Top', paymentMethod: 'dinheiro', cep: VALID_CEP })
      .expect(201);

    const ids = [withinWindow.body.id, outsideWindow.body.id, neverCompleted.body.id];
    try {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      await tenantContext.runInTenantContext(tenantA.tenantId, async (tx) => {
        await tx.order.update({ where: { id: withinWindow.body.id }, data: { status: 'completed' } });
        await tx.order.update({ where: { id: outsideWindow.body.id }, data: { status: 'completed', createdAt: oldDate } });
        // neverCompleted fica 'pending' mesmo, de proposito.
      });

      const res = await request(app.getHttpServer())
        .get('/v1/orders/top-products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const refrigerante = res.body.find((p: { name: string }) => p.name === 'Refrigerante');
      expect(refrigerante).toBeDefined();
      expect(refrigerante.sales).toBe(2);
      expect(refrigerante.revenue).toBeCloseTo(16, 2);
    } finally {
      await tenantContext.runInTenantContext(tenantA.tenantId, async (tx) => {
        await tx.orderItem.deleteMany({ where: { orderId: { in: ids } } });
        await tx.order.deleteMany({ where: { id: { in: ids } } });
      });
    }
  });

  it('GET /orders/top-products cliente nao pode (403)', async () => {
    await request(app.getHttpServer())
      .get('/v1/orders/top-products')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('maquina de estados: transicao valida (200), invalida (400), cliente nao pode (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'preparing' })
      .expect(403);

    const ok = await request(app.getHttpServer())
      .patch(`/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'preparing' })
      .expect(200);
    expect(ok.body.status).toBe('preparing');

    await request(app.getHttpServer())
      .patch(`/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'completed' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'delivery' })
      .expect(200);
  });
});
