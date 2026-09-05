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
  // Usado so' por bebida (type='drink'); pizza usa os 3 campos abaixo (fica null).
  price: number | null;
  priceBrotinho: number | null;
  priceOitoPedacos: number | null;
  priceDozePedacos: number | null;
  size: string;
  image: string;
  ingredients: string[];
  featured: boolean;
  available: boolean;
  type: string;
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
    price: product.price?.toNumber() ?? null,
    priceBrotinho: product.priceBrotinho?.toNumber() ?? null,
    priceOitoPedacos: product.priceOitoPedacos?.toNumber() ?? null,
    priceDozePedacos: product.priceDozePedacos?.toNumber() ?? null,
    size: product.size,
    image: product.image,
    ingredients: product.ingredients as string[],
    featured: product.featured,
    available: product.available,
    type: product.type,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
