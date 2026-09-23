import { BadRequestException } from '@nestjs/common';
import { Product } from '@prisma/client';
import { PizzaSizeId } from '../orders/pizza-size';

// Preco explicito por tamanho (revertido de preco-base x multiplicador nesta sprint) --
// o dono digita o preco real de cada tamanho no cadastro do produto (ProductForm.tsx),
// o servidor so' le o campo certo, nunca recalcula. Lanca 400 se o produto de pizza nao
// tiver o preco daquele tamanho cadastrado -- nao deveria acontecer (DTO exige os 3 na
// criacao), mas produtos criados antes desta sprint podem nao ter, entao a validacao
// fica tambem aqui, no ponto que realmente cobra o cliente.
export function getPizzaSizePrice(product: Product, size: PizzaSizeId): number {
  const field =
    size === 'brotinho'
      ? product.priceBrotinho
      : size === 'oito-pedacos'
        ? product.priceOitoPedacos
        : product.priceDozePedacos;

  // <= 0, nao so' null: R$0,00 nao e' um preco de verdade (ninguem vende pizza de
  // graca) -- o DTO ja rejeita 0 na entrada (catalog/dto/*-product.dto.ts,
  // Min(0.01)), mas produtos criados antes dessa regra existir podem ter um 0
  // residual gravado, e essa e' a ultima linha de defesa antes de cobrar o cliente.
  const value = field == null ? null : field.toNumber();
  if (value == null || value <= 0) {
    throw new BadRequestException(`Produto "${product.name}" nao tem preco cadastrado para o tamanho "${size}".`);
  }
  return value;
}
