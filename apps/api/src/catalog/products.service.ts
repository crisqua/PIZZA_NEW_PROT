import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toProductResponse } from '../common/product-response.util';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRISMA_FOREIGN_KEY_CONSTRAINT = 'P2003';

@Injectable()
export class ProductsService {
  async create(tx: TenantTx, tenantId: string, dto: CreateProductDto) {
    // RLS primeiro, nao catch de erro cru: categoria de outro tenant ja e' invisivel sob
    // RLS (null), mesmo padrao de UsersController.findOne -- 404 limpo, nunca confirma se
    // o id existe ou nao (mesma resposta pra "nao existe" e "e' de outro tenant").
    await this.assertCategoryExists(tx, dto.categoryId);

    try {
      const product = await tx.product.create({
        data: {
          tenantId,
          categoryId: dto.categoryId,
          name: dto.name,
          description: dto.description ?? '',
          price: dto.price,
          priceBrotinho: dto.priceBrotinho,
          priceOitoPedacos: dto.priceOitoPedacos,
          priceDozePedacos: dto.priceDozePedacos,
          image: dto.image ?? '',
          ingredients: dto.ingredients ?? [],
          featured: dto.featured ?? false,
          available: dto.available ?? true,
          type: dto.type ?? 'pizza',
        },
      });
      return toProductResponse(product);
    } catch (err) {
      // Defensivo: cobre a corrida rara (categoria apagada entre o pre-check acima e
      // este insert, mesma transacao, janela minima mas nao zero) -- sem isso viraria um
      // 500 cru. No caminho normal, o pre-check acima ja intercepta antes de chegar aqui.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_FOREIGN_KEY_CONSTRAINT) {
        throw new NotFoundException('Categoria nao encontrada.');
      }
      throw err;
    }
  }

  async list(tx: TenantTx) {
    const products = await tx.product.findMany({ orderBy: { createdAt: 'asc' } });
    return products.map(toProductResponse);
  }

  async findOne(tx: TenantTx, id: string) {
    const product = await tx.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException();
    }
    return toProductResponse(product);
  }

  async update(tx: TenantTx, id: string, dto: UpdateProductDto) {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }

    if (dto.categoryId) {
      await this.assertCategoryExists(tx, dto.categoryId);
    }

    try {
      const updated = await tx.product.update({ where: { id }, data: { ...dto } });
      return toProductResponse(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_FOREIGN_KEY_CONSTRAINT) {
        throw new NotFoundException('Categoria nao encontrada.');
      }
      throw err;
    }
  }

  async remove(tx: TenantTx, id: string): Promise<void> {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }
    await tx.product.delete({ where: { id } });
  }

  private async assertCategoryExists(tx: TenantTx, categoryId: string): Promise<void> {
    const category = await tx.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada.');
    }
  }
}
