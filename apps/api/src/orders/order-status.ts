import { BadRequestException } from '@nestjs/common';

export type OrderStatus = 'pending' | 'preparing' | 'delivery' | 'completed' | 'cancelled';

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'preparing', 'delivery', 'completed', 'cancelled'];

// Maquina de estados do pedido (Sprint 7, docs/MVP_SPRINTS.md) -- 'cancelled' e' alcancavel
// de qualquer estado nao-terminal, os demais formam um pipeline linear. Nunca aceitar
// status arbitrario vindo do cliente (DoD literal desta sprint): todo PATCH .../status
// passa por assertValidTransition antes de escrever no banco.
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['delivery', 'cancelled'],
  delivery: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function assertValidTransition(current: string, next: string): void {
  const allowed = ORDER_STATUS_TRANSITIONS[current as OrderStatus];
  if (!allowed || !allowed.includes(next as OrderStatus)) {
    throw new BadRequestException(`Transicao de status invalida: ${current} -> ${next}`);
  }
}
