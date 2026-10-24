import { ApiOrder, ApiOrderStatus } from '../data/repository';

// Helpers de exibicao compartilhados por OrderConfirmation, OrderHistory, OrderTracking e
// ReorderSection -- evita 4 copias do mesmo mapa de status/formatacao de data.

export const STATUS_LABEL: Record<ApiOrderStatus, string> = {
  pending: 'Pedido recebido',
  preparing: 'Em preparo',
  delivery: 'Saiu para entrega',
  completed: 'Entregue',
  cancelled: 'Cancelado',
};

export function statusVariant(status: ApiOrderStatus): 'success' | 'warning' | 'destructive' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'destructive';
  return 'warning';
}

// "24/10 · 19:42" no fuso de Sao Paulo (mesmo fuso usado pra todo calculo de dia no sistema).
export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

// "2x Calabresa, 1x Coca-Cola" -- resumo de uma linha pros cards de lista.
export function summarizeItems(order: ApiOrder): string {
  if (!order.items?.length) return '';
  return order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ');
}
