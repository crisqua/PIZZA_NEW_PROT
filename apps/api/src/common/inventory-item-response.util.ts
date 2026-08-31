import { InventoryItem } from '@prisma/client';

// Mesmo gotcha de sempre: Prisma.Decimal serializa via .toJSON() como STRING, nao
// number -- response mapeia .toNumber() explicitamente.
export interface InventoryItemResponse {
  id: string;
  tenantId: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toInventoryItemResponse(item: InventoryItem): InventoryItemResponse {
  return {
    id: item.id,
    tenantId: item.tenantId,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity.toNumber(),
    minQuantity: item.minQuantity.toNumber(),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
