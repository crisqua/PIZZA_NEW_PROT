// Tamanho de pizza -- so' o id/lista continuam aqui (usados na validacao do DTO via
// @IsIn). O preco por tamanho deixou de ser preco-base x multiplicador (revertido nesta
// sprint): cada Product de pizza guarda 3 precos explicitos (priceBrotinho/
// priceOitoPedacos/priceDozePedacos), o que o dono digita e' exatamente o que o cliente
// paga. Ver Product.priceForSize em product-price.util.ts pro lookup autoritativo.
export type PizzaSizeId = 'brotinho' | 'oito-pedacos' | 'doze-pedacos';

export const PIZZA_SIZE_IDS: PizzaSizeId[] = ['brotinho', 'oito-pedacos', 'doze-pedacos'];
