import { useEffect, useState } from 'react';
import { Clock, Phone, MapPin, DollarSign, Inbox } from 'lucide-react';
import { getOrders, ApiOrder } from '../data/repository';
import { Card, CardContent, Badge, formatCurrency, formatTime } from '@pizza/ui';

interface OrdersPanelProps {
  onViewOrder: (order: ApiOrder) => void;
}

const POLL_INTERVAL_MS = 10_000;

// Pedido criado pelo cliente precisa aparecer aqui "em tempo habil" (DoD da Sprint 9) --
// polling a cada 10s enquanto a tela estiver montada, mesmo intervalo ja usado em
// apps/cliente/src/components/OrderConfirmation.tsx (Sprint 7). Sem WebSocket (fora do
// MVP, docs/MVP.md item 8).
export function OrdersPanel({ onViewOrder }: OrdersPanelProps) {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApiOrder['status'] | 'all'>('all');

  const statusConfig = {
    pending: { label: 'Pendente', variant: 'warning' as const, color: 'bg-warning/10' },
    preparing: { label: 'Preparando', variant: 'info' as const, color: 'bg-info/10' },
    delivery: { label: 'Saiu para entrega', variant: 'default' as const, color: 'bg-primary/10' },
    completed: { label: 'Entregue', variant: 'success' as const, color: 'bg-success/10' },
    cancelled: { label: 'Cancelado', variant: 'destructive' as const, color: 'bg-destructive/10' },
  };

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      getOrders()
        .then((res) => { if (!cancelled) setOrders(res); })
        .catch(() => undefined);
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const ordersByStatus = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    delivery: orders.filter(o => o.status === 'delivery').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Pedidos em Tempo Real</h1>
        <p className="text-muted-foreground">Gerencie todos os pedidos da sua pizzaria</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(ordersByStatus).map(([status, count]) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          return (
            <Card key={status} className={config.color}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{config.label}</p>
                    <p className="text-3xl font-bold">{count}</p>
                  </div>
                  <Badge variant={config.variant}>{count}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            statusFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Todos ({orders.length})
        </button>
        {Object.entries(statusConfig).map(([status, config]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as ApiOrder['status'])}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {config.label} ({ordersByStatus[status as keyof typeof ordersByStatus] || 0})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const config = statusConfig[order.status];
          return (
            <Card
              key={order.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onViewOrder(order)}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg mb-1">#{order.id.slice(0, 8)}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatTime(new Date(order.createdAt))}
                    </div>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{order.customerName}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{order.address}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                    </span>
                    <div className="flex items-center gap-1 text-primary font-bold">
                      <DollarSign className="w-4 h-4" />
                      {formatCurrency(order.total)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhum pedido encontrado</h3>
          <p className="text-muted-foreground">
            {statusFilter === 'all'
              ? 'Aguardando novos pedidos...'
              : 'Nenhum pedido com este status'}
          </p>
        </div>
      )}
    </div>
  );
}
