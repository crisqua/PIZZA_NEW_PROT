import { TenantContextService } from '../../src/prisma/tenant-context.service';

export interface SeededCategory {
  id: string;
  tenantId: string;
  name: string;
}

// "categories"/"products" tem RLS de verdade -- sempre via runInTenantContext, mesma
// disciplina de seed-subscription.ts.
export async function seedCategory(
  tenantContext: TenantContextService,
  tenantId: string,
  name = 'Categoria Teste',
): Promise<SeededCategory> {
  const category = await tenantContext.runInTenantContext(tenantId, (tx) =>
    tx.category.create({ data: { tenantId, name } }),
  );
  return { id: category.id, tenantId, name: category.name };
}

export async function cleanupCategory(tenantContext: TenantContextService, tenantId: string, categoryId: string): Promise<void> {
  await tenantContext.runInTenantContext(tenantId, (tx) => tx.category.delete({ where: { id: categoryId } }));
}

export interface SeededProduct {
  id: string;
  tenantId: string;
  categoryId: string;
}

export async function seedProduct(
  tenantContext: TenantContextService,
  tenantId: string,
  categoryId: string,
  overrides: { name?: string; price?: number; type?: string } = {},
): Promise<SeededProduct> {
  const product = await tenantContext.runInTenantContext(tenantId, (tx) =>
    tx.product.create({
      data: {
        tenantId,
        categoryId,
        name: overrides.name ?? 'Produto Teste',
        price: overrides.price ?? 10,
        type: overrides.type ?? 'pizza',
      },
    }),
  );
  return { id: product.id, tenantId, categoryId };
}

// Chamar ANTES de cleanupCategory/cleanupTenantWithUser -- products.category_id tem FK
// RESTRICT contra categories(id), apagar a categoria primeiro quebraria com violacao de FK.
export async function cleanupProduct(tenantContext: TenantContextService, tenantId: string, productId: string): Promise<void> {
  await tenantContext.runInTenantContext(tenantId, (tx) => tx.product.delete({ where: { id: productId } }));
}
