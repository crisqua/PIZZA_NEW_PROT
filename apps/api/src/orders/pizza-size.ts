// Espelha apps/cliente/src/data/mockData.ts (pizzaSizes) -- duplicacao deliberada: o
// preco NUNCA pode vir do cliente, entao o servidor precisa da propria copia da tabela de
// multiplicadores pra calcular unitPrice de forma autoritativa (OrdersService).
export type PizzaSizeId = 'brotinho' | 'oito-pedacos' | 'doze-pedacos';

export const PIZZA_SIZE_MULTIPLIERS: Record<PizzaSizeId, number> = {
  brotinho: 0.75,
  'oito-pedacos': 1.35,
  'doze-pedacos': 1.8,
};

export const PIZZA_SIZE_IDS: PizzaSizeId[] = ['brotinho', 'oito-pedacos', 'doze-pedacos'];
