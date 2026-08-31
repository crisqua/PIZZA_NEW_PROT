import { Product } from '@prisma/client';

// Mesmo gotcha de sempre: Prisma.Decimal serializa via .toJSON() como STRING, nao
// number -- response mapeia .toNumber() explicitamente (ver tenant-response.util.ts /
// plan-response.util.ts).
export interface ProductResponse {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  ingredients: string[];
  featured: boolean;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    tenantId: product.tenantId,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    price: product.price.toNumber(),
    image: product.image,
    ingredients: product.ingredients as string[],
    featured: product.featured,
    available: product.available,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
