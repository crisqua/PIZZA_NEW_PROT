import { useState } from 'react';
import { ArrowLeft, Phone, MapPin, CreditCard, CheckCircle2 } from 'lucide-react';
import { ApiOrder, updateOrderStatus } from '../data/repository';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, formatCurrency, formatTime } from '@pizza/ui';

interface OrderDetailsProps {
  order: ApiOrder;
  onBack: () => void;
}

// Itens aqui vem do formato real da API (OrderItemResponse): "name" ja' e' o snapshot
// pronto pra exibir (ex. "Marguerita + Calabresa" pro meio a meio, calculado no servidor
// em OrdersService.create na Sprint 7) -- diferente do mock antigo, que guardava
// pizza.flavors: Pizza[] completo. "size" e' null pra bebida.
export function OrderDetails({ order: initialOrder, onBack }: OrderDetailsProps) {
  const [order, setOrder] = useState(initialOrder);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const statusConfig = {
    pending: { label: 'Pendente', variant: 'warning' as const, next: 'preparing' as const, nextLabel: 'Iniciar Preparo' },
    preparing: { label: 'Preparando', variant: 'info' as const, next: 'delivery' as const, nextLabel: 'Saiu para Entrega' },
    delivery: { label: 'Saiu para entrega', variant: 'default' as const, next: 'completed' as const, nextLabel: 'Marcar como Entregue' },
    completed: { label: 'Entregue', variant: 'success' as const, next: undefined, nextLabel: undefined },
    cancelled: { label: 'Cancelado', variant: 'destructive' as const, next: undefined, nextLabel: undefined },
  };

  const config = statusConfig[order.status];
  const subtotal = order.total - order.deliveryFee;

  const handleUpdateStatus = async (status: ApiOrder['status']) => {
    setError('');
    setUpdating(true);
    try {
      const updated = await updateOrderStatus(order.id, status);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel atualizar o status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para pedidos
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Pedido #{order.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">
              Realizado em {formatTime(new Date(order.createdAt))}
            </p>
          </div>
          <Badge variant={config.variant} className="text-base px-4 py-2">
            {config.label}
          </Badge>
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Itens do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center text-2xl">
                    {item.type === 'pizza' ? '🍕' : '🥤'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {item.name}
                      {item.size && <span className="text-muted-foreground font-normal"> · {item.size}</span>}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Quantidade: {item.quantity}</p>
                  </div>
                  <span className="font-bold">{formatCurrency(item.unitPrice * item.quantity)}</span>
                </div>
              ))}

              <div className="pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {config.next && (
            <Card className="bg-accent border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Próxima Ação</h3>
                    <p className="text-sm text-muted-foreground">
                      Atualizar status do pedido para a próxima etapa
                    </p>
                  </div>
                  <Button onClick={() => handleUpdateStatus(config.next!)} disabled={updating}>
                    <CheckCircle2 className="w-5 h-5" />
                    {config.nextLabel}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">Telefone</span>
                </div>
                <p className="font-medium">{order.phone}</p>
              </div>
              <div>
                <p className="font-semibold mb-1">{order.customerName}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço de Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                <p className="text-sm">
                  {[order.address, order.addressNumber, order.complement, order.neighborhood].filter(Boolean).join(', ')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{order.paymentMethod}</span>
                {order.changeFor && (
                  <span className="text-sm text-muted-foreground">(troco para {formatCurrency(order.changeFor)})</span>
                )}
              </div>
              <Badge variant="warning">Pagamento na Entrega</Badge>
            </CardContent>
          </Card>

          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <Button
              variant="destructive"
              fullWidth
              disabled={updating}
              onClick={() => handleUpdateStatus('cancelled')}
            >
              Cancelar Pedido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
