import { Injectable, NotFoundException } from '@nestjs/common';
import { toInventoryItemResponse } from '../common/inventory-item-response.util';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

// Sempre recebe o "tx" ja aberto pelo TenantContextInterceptor -- nunca abre a propria
// transacao (diferente do ModuleGuard, que precisa por rodar antes do interceptor).
@Injectable()
export class InventoryService {
  async create(tx: TenantTx, tenantId: string, dto: CreateInventoryItemDto) {
    const item = await tx.inventoryItem.create({
      data: { tenantId, name: dto.name, unit: dto.unit, quantity: dto.quantity, minQuantity: dto.minQuantity },
    });
    return toInventoryItemResponse(item);
  }

  async list(tx: TenantTx) {
    const items = await tx.inventoryItem.findMany({ orderBy: { createdAt: 'asc' } });
    return items.map(toInventoryItemResponse);
  }

  async findOne(tx: TenantTx, id: string) {
    const item = await tx.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException();
    }
    return toInventoryItemResponse(item);
  }

  async update(tx: TenantTx, id: string, dto: UpdateInventoryItemDto) {
    const existing = await tx.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }
    const updated = await tx.inventoryItem.update({ where: { id }, data: { ...dto } });
    return toInventoryItemResponse(updated);
  }

  async remove(tx: TenantTx, id: string): Promise<void> {
    const existing = await tx.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }
    await tx.inventoryItem.delete({ where: { id } });
  }
}
