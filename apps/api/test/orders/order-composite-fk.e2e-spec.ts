import { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupCategory, cleanupProduct, seedCategory, seedProduct, SeededCategory, SeededProduct } from '../utils/seed-catalog';

// Mesmo raciocinio de test/catalog/products-category-composite-fk.e2e-spec.ts (Sprint 5):
// o caminho normal da aplicacao (OrdersService.create) faz um pre-check via RLS ANTES de
// inserir, entao NUNCA exercita a FK composta de verdade (produto de outro tenant ja e'
// invisivel sob RLS -> 404 limpo, coberto em orders-crud.e2e-spec.ts). Este teste bypassa
// o service de proposito, indo direto no Prisma, pra provar que as constraints SQL
// hand-written (migration 20260904010000_add_orders) estao realmente ligadas no banco --
// completa a cadeia order_items->products->categories da arquitetura secao 3.2 item 5 /
// secao 4.1, cuja segunda perna (order_items->products) so' podia nascer nesta sprint.
describe('FK composta order_items.(tenant_id, product_id) -> products(tenant_id, id)', () => {
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;
  let categoryB: SeededCategory;
  let productB: SeededProduct;
  let orderId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    tenantContext = new TenantContextService(prisma);

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fk-ord-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fk-ord-b', role: 'tenant_owner' });
    categoryB = await seedCategory(tenantContext, tenantB.tenantId, 'Categoria de B');
    productB = await seedProduct(tenantContext, tenantB.tenantId, categoryB.id, { name: 'Produto de B' });

    // Pedido valido do proprio tenant A, so' pra ter um order_id real pra tentar
    // referenciar o item.
    const order = await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.order.create({
        data: {
          tenantId: tenantA.tenantId,
          customerId: tenantA.userId,
          idempotencyKey: 'fk-test-key',
          customerName: 'Teste',
          phone: '119999',
          address: 'Rua Teste',
          paymentMethod: 'dinheiro',
          deliveryFee: 0,
          total: 10,
        },
      }),
    );
    orderId = order.id;
  });

  afterAll(async () => {
    await tenantContext.runInTenantContext(tenantA.tenantId, (tx) => tx.order.delete({ where: { id: orderId } }));
    await cleanupProduct(tenantContext, tenantB.tenantId, productB.id);
    await cleanupCategory(tenantContext, tenantB.tenantId, categoryB.id);
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await prisma.$disconnect();
  });

  it('insercao direta (bypassando o service) com productId de outro tenant falha com P2003', async () => {
    const attempt = tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.orderItem.create({
        data: {
          tenantId: tenantA.tenantId,
          orderId,
          productId: productB.id,
          type: 'pizza',
          name: 'FK composite test',
          unitPrice: 10,
          quantity: 1,
        },
      }),
    );

    await expect(attempt).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    await expect(attempt).rejects.toMatchObject({ code: 'P2003' });
  });
});
