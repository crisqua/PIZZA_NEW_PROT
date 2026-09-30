import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CepLookupService } from '../../src/common/cep-lookup.service';
import { hashPassword } from '../../src/common/password.util';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupCategory, cleanupProduct, seedCategory, seedProduct, SeededCategory, SeededProduct } from '../utils/seed-catalog';

const VALID_CEP = '01310-100';
// Sobrescreve so' pra este arquivo (limit em orders.module.ts e' lido POR REQUISICAO,
// nao uma vez no boot -- ver comentario la') -- localmente/CI o .env/.env do workflow
// sobem RATE_LIMIT_IP_PER_MIN pra 1000 (pra nao atrapalhar outros arquivos de teste que
// criam varios pedidos), entao este arquivo precisa do proprio valor baixo pra
// conseguir estourar o limite de verdade sem disparar centenas de requisicoes.
const IP_LIMIT_PER_MIN = 5;

// Sprint 15: POST /orders exige rate limit (por IP e por pizzaria) -- protege o unico
// endpoint publico de escrita deste sistema contra abuso/bug de retry-loop. Este teste
// confirma que o guard esta de verdade ligado nesta rota (nao so' configurado e nunca
// aplicado) -- dispara mais requisicoes que o limite e confirma o 429.
describe('Rate limiting em POST /v1/orders', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenant: SeededTenantUser;
  let category: SeededCategory;
  let product: SeededProduct;
  let customerToken: string;

  // process.env NAO e' isolado por arquivo pelo Jest (diferente do cache de modulos) --
  // com --runInBand, varios arquivos de teste compartilham o MESMO processo Node. Guarda
  // o valor original pra restaurar no afterAll, senao um arquivo que rodar depois deste
  // no mesmo processo herdaria o limite baixo por engano.
  const originalIpLimit = process.env.RATE_LIMIT_IP_PER_MIN;

  beforeAll(async () => {
    // Sobrescreve so' o processo deste arquivo -- lido por requisicao em orders.module.ts,
    // nunca cacheado, entao isso ja vale pras chamadas feitas mais abaixo neste arquivo.
    process.env.RATE_LIMIT_IP_PER_MIN = String(IP_LIMIT_PER_MIN);

    const cepLookupMock = jest.fn().mockResolvedValue({ address: 'Rua Teste', neighborhood: 'Centro', city: 'Sao Paulo', state: 'SP' });
    app = await createTestApp((builder) =>
      builder.overrideProvider(CepLookupService).useValue({ resolve: cepLookupMock }),
    );
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    tenant = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'rl', role: 'tenant_owner' });
    category = await seedCategory(tenantContext, tenant.tenantId, 'Categoria RL');
    product = await seedProduct(tenantContext, tenant.tenantId, category.id, { name: 'Pizza RL', priceOitoPedacos: 40, type: 'pizza' });

    const customerPassword = randomUUID();
    const passwordHash = await hashPassword(customerPassword);
    const customer = await tenantContext.runInTenantContext(tenant.tenantId, (tx) =>
      tx.user.create({
        data: { tenantId: tenant.tenantId, email: `rl-customer@${tenant.tenantSlug}.test`, name: 'Cliente RL', role: 'customer', passwordHash },
      }),
    );

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: customer.email, password: customerPassword, tenantSlug: tenant.tenantSlug })
      .expect(200);
    customerToken = login.body.accessToken;
  });

  afterAll(async () => {
    process.env.RATE_LIMIT_IP_PER_MIN = originalIpLimit;
    await tenantContext.runInTenantContext(tenant.tenantId, async (tx) => {
      await tx.orderItem.deleteMany({ where: { tenantId: tenant.tenantId } });
      await tx.order.deleteMany({ where: { tenantId: tenant.tenantId } });
    });
    await cleanupProduct(tenantContext, tenant.tenantId, product.id);
    await cleanupCategory(tenantContext, tenant.tenantId, category.id);
    await cleanupTenantWithUser(prisma, tenantContext, tenant);
    await app.close();
  });

  it(`estoura o limite de ${IP_LIMIT_PER_MIN}/min por IP -- a requisicao seguinte retorna 429`, async () => {
    const send = () =>
      request(app.getHttpServer())
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
        });

    // As IP_LIMIT_PER_MIN primeiras devem passar pelo guard (podem dar 201 -- nao e' o
    // que este teste verifica, so' que NENHUMA delas seja 429 ainda).
    for (let i = 0; i < IP_LIMIT_PER_MIN; i++) {
      const res = await send();
      expect(res.status).not.toBe(429);
    }

    // A proxima estoura o limite.
    const blocked = await send();
    expect(blocked.status).toBe(429);
  });
});
