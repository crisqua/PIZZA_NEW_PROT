import { useEffect, useState } from 'react';
import { Clock, MapPin, Phone, Search, ChevronDown, ChevronUp, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { getOrders, updateOrderStatus, ApiOrder } from '../data/repository';
import { Card, Badge, Button, Input, formatCurrency, formatTime, formatPhone } from '@pizza/ui';

const POLL_INTERVAL_MS = 10_000;

// Tempo decorrido desde que o pedido entrou ate' agora (pedido do usuario) -- em minutos
// se for menos de 1h, em horas+minutos caso contrario. Recalculado a cada render (o
// polling ja' re-renderiza a cada 10s, nao precisa de um timer dedicado so' pra isso).
function formatElapsed(createdAt: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

// Pedido criado pelo cliente precisa aparecer aqui "em tempo habil" (DoD da Sprint 9) --
// polling a cada 10s enquanto a tela estiver montada, mesmo intervalo ja usado em
// apps/cliente/src/components/OrderConfirmation.tsx (Sprint 7). Sem WebSocket (fora do
// MVP, docs/MVP.md item 8).
//
// Redesenho (pedido do usuario): o card da lista ja' mostra tudo -- sem navegar pra uma
// tela de detalhe separada so' pra mudar o status. "Itens e Valores" fica atras de um
// acordeao por card (mesmo padrao de categoria do apps/cliente/Menu.tsx); cliente e
// endereco ficam no resumo do proprio card, sem precisar abrir nada. O botao de acao
// (Iniciar Preparo/Saiu para Entrega/Entregue) fica sempre visivel no rodape do card.
export function OrdersPanel() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApiOrder['status'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openItemsIds, setOpenItemsIds] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const statusConfig = {
    pending: { label: 'Pendente', variant: 'warning' as const, color: 'bg-warning/10', next: 'preparing' as const, nextLabel: 'Iniciar Preparo' },
    preparing: { label: 'Preparando', variant: 'info' as const, color: 'bg-info/10', next: 'delivery' as const, nextLabel: 'Saiu para Entrega' },
    delivery: { label: 'Saiu para entrega', variant: 'default' as const, color: 'bg-primary/10', next: 'completed' as const, nextLabel: 'Entregue' },
    completed: { label: 'Entregue', variant: 'success' as const, color: 'bg-success/10', next: undefined, nextLabel: undefined },
    cancelled: { label: 'Cancelado', variant: 'destructive' as const, color: 'bg-destructive/10', next: undefined, nextLabel: undefined },
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

  const toggleItems = (orderId: string) => {
    setOpenItemsIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  const handleAdvance = async (order: ApiOrder, nextStatus: ApiOrder['status']) => {
    setErrorId(null);
    setErrorMsg('');
    setUpdatingId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      setErrorId(order.id);
      setErrorMsg(err instanceof Error ? err.message : 'Nao foi possivel atualizar o status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || o.customerName.toLowerCase().includes(term) || o.id.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

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
          const config = statusConfig[status as keyof typeof ordersByStatus];
          return (
            <Card key={status} className={config.color}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{config.label}</p>
                    <p className="text-3xl font-bold">{count}</p>
                  </div>
                  <Badge variant={config.variant}>{count}</Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou número do pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredOrders.map((order) => {
          const config = statusConfig[order.status];
          const itemsOpen = openItemsIds.has(order.id);
          const itemsCount = order.items.reduce((s, it) => s + it.quantity, 0);
          const subtotal = order.total - order.deliveryFee;
          const shortAddress = [order.address, order.addressNumber, order.neighborhood].filter(Boolean).join(', ');

          return (
            <Card key={order.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                  <span className="text-sm"><span className="text-muted-foreground">Pedido:</span> <span className="font-bold">#{order.id.slice(0, 8)}</span></span>
                  <span className="text-sm flex items-center gap-1.5"><span className="text-muted-foreground">Horário Pedido:</span> {formatTime(order.createdAt)}h</span>
                  <span className="text-sm flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Tempo decorrido:</span> {formatElapsed(order.createdAt)}</span>
                  <span className="text-sm flex items-center gap-1.5"><span className="text-muted-foreground">Status:</span> <Badge variant={config.variant}>{config.label}</Badge></span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{order.customerName}</span>
                  <span className="text-base font-bold text-primary whitespace-nowrap">{formatCurrency(order.total)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatPhone(order.phone)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 overflow-hidden">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{shortAddress}</span>
                  <span className="shrink-0 whitespace-nowrap">· {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}</span>
                </div>
              </div>

              <button
                onClick={() => toggleItems(order.id)}
                className="w-full flex items-center justify-between px-4 py-3 border-t border-border hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                  Itens e Valores
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{itemsCount}</span>
                </span>
                {itemsOpen ? (
                  <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {itemsOpen && (
                <div className="border-t border-border px-4 py-4">
                  <div className="grid gap-3 pb-2" style={{ gridTemplateColumns: '48px 1fr 100px' }}>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Qtde</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Item Pedido</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground text-right">Valor Unitário</span>
                  </div>
                  {order.items.map((item) => (
                    <div key={item.id} className="grid gap-3 items-center py-2.5 border-t border-border" style={{ gridTemplateColumns: '48px 1fr 100px' }}>
                      <span className="text-sm font-bold">{item.quantity}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold truncate">{item.name}</span>
                        {item.size && <span className="block text-xs text-muted-foreground">{item.size}</span>}
                      </span>
                      <span className="text-sm font-semibold text-right whitespace-nowrap">{formatCurrency(item.unitPrice)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-border my-3" />
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Taxa de entrega</span>
                      <span>{formatCurrency(order.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-border p-4 flex items-center justify-between gap-3">
                {errorId === order.id && <p className="text-sm text-destructive">{errorMsg}</p>}
                <div className="flex-1" />
                {config.next && config.nextLabel && (
                  <Button onClick={() => handleAdvance(order, config.next!)} disabled={updatingId === order.id}>
                    <CheckCircle2 className="w-4 h-4" />
                    {config.nextLabel}
                  </Button>
                )}
                {order.status === 'completed' && (
                  <span className="flex items-center gap-2 text-sm font-medium text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    Pedido entregue
                  </span>
                )}
                {order.status === 'cancelled' && (
                  <span className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <XCircle className="w-4 h-4" />
                    Pedido cancelado
                  </span>
                )}
              </div>
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
