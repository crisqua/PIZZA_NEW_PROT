import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const PRISMA_FOREIGN_KEY_CONSTRAINT = 'P2003';

// Sempre recebe o "tx" ja aberto pelo TenantContextInterceptor (@CurrentTenant()) —
// nunca abre a propria transacao, diferente do ModuleGuard (que precisa, por rodar antes
// do interceptor no pipeline).
@Injectable()
export class CategoriesService {
  create(tx: TenantTx, tenantId: string, dto: CreateCategoryDto) {
    return tx.category.create({ data: { tenantId, name: dto.name, type: dto.type ?? 'pizza' } });
  }

  list(tx: TenantTx) {
    return tx.category.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(tx: TenantTx, id: string) {
    const category = await tx.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException();
    }
    return category;
  }

  async update(tx: TenantTx, id: string, dto: UpdateCategoryDto) {
    await this.findOne(tx, id);
    return tx.category.update({ where: { id }, data: { ...dto } });
  }

  async remove(tx: TenantTx, id: string): Promise<void> {
    await this.findOne(tx, id);
    try {
      await tx.category.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_FOREIGN_KEY_CONSTRAINT) {
        throw new ConflictException('Categoria tem produtos vinculados.');
      }
      throw err;
    }
  }
}
