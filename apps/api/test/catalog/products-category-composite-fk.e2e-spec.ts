import { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';
import { cleanupCategory, seedCategory, SeededCategory } from '../utils/seed-catalog';

// Arquitetura secao 3.2 item 5 / secao 4.1 — FK composta. O DoD da Sprint 5 pede um teste
// que prove que a FK falha NO BANCO, nao so' na aplicacao. O ProductsService normal (ver
// products.service.ts) faz um pre-check via RLS ANTES de inserir (categoria de outro
// tenant ja e' invisivel sob RLS -> 404 limpo, sem nunca tocar na FK de verdade) -- esse
// e' o comportamento certo pra API real, mas significa que o caminho normal da aplicacao
// NUNCA exercita a constraint. Este teste bypassa o service/controller de proposito, indo
// direto no Prisma, especificamente pra provar que a constraint SQL hand-written
// (migration 20260902000000_add_catalog) e' real e esta ligada — nao um teste duplicado
// do 404 ja coberto em products-crud.e2e-spec.ts.
//
// Metade order_items->products da mesma secao 3.2 item 5 fica pra Sprint 7 (orders ainda
// nao existe).
describe('FK composta products.(tenant_id, category_id) -> categories(tenant_id, id)', () => {
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantA: SeededTenantUser;
  let tenantB: SeededTenantUser;
  let categoryB: SeededCategory;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    tenantContext = new TenantContextService(prisma);

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fk-a', role: 'tenant_owner' });
    tenantB = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'fk-b', role: 'tenant_owner' });
    categoryB = await seedCategory(tenantContext, tenantB.tenantId, 'Categoria de B');
  });

  afterAll(async () => {
    await cleanupCategory(tenantContext, tenantB.tenantId, categoryB.id);
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await cleanupTenantWithUser(prisma, tenantContext, tenantB);
    await prisma.$disconnect();
  });

  it('insercao direta (bypassando o service) com categoryId de outro tenant falha com P2003', async () => {
    const attempt = tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.product.create({
        data: {
          tenantId: tenantA.tenantId,
          categoryId: categoryB.id,
          name: 'FK composite test',
          price: 10,
        },
      }),
    );

    await expect(attempt).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    await expect(attempt).rejects.toMatchObject({ code: 'P2003' });
  });
});
