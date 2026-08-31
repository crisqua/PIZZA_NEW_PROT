import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getOrder, ApiOrder } from '../data/repository';
import { Button, Card, CardContent, Badge, formatCurrency } from '@pizza/ui';

interface OrderConfirmationProps {
  orderId: string;
  total: number;
  estimatedTime: string;
  customerName?: string;
  onBackToMenu: () => void;
}

const STATUS_LABEL: Record<ApiOrder['status'], string> = {
  pending: 'Pedido recebido',
  preparing: 'Em preparo',
  delivery: 'Saiu para entrega',
  completed: 'Entregue',
  cancelled: 'Cancelado',
};

const POLL_INTERVAL_MS = 10_000;

// Acompanhamento do proprio pedido via polling (Sprint 7, MVP.md item 9 -- "Cliente
// acompanha status do proprio pedido via polling"; WebSocket e' Fase 3, fora do MVP).
export function OrderConfirmation({ orderId, total, estimatedTime, customerName, onBackToMenu }: OrderConfirmationProps) {
  const [status, setStatus] = useState<ApiOrder['status']>('pending');

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const order = await getOrder(orderId);
        if (!cancelled) {
          setStatus(order.status);
        }
      } catch {
        // Rede instavel/token expirado -- so' tenta de novo no proximo tick, sem quebrar a tela.
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-success/10 border border-success/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-11 h-11 text-success" />
          </div>
          <h1 className="font-serif text-2xl text-foreground mb-2">
            {customerName ? `Valeu, ${customerName}!` : 'Pedido Confirmado!'}
          </h1>
          <p className="text-muted-foreground">Seu pedido foi recebido e ja esta sendo acompanhado pela pizzaria</p>
        </div>

        <Card className="rounded-xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Número do pedido</span>
              <Badge className="text-sm px-3 py-1.5">#{orderId.slice(0, 8)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={status === 'cancelled' ? 'destructive' : 'warning'}>{STATUS_LABEL[status]}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-serif text-xl text-primary font-semibold">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tempo estimado</span>
              <Badge variant="warning">{estimatedTime}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-3">Próximos passos</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">1.</span>
                <span>A pizzaria confirma e prepara seu pedido</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">2.</span>
                <span>Tenha o pagamento pronto na entrega</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">3.</span>
                <span>Acompanhe o status do pedido aqui, em tempo real</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button fullWidth size="lg" onClick={onBackToMenu} className="h-14 rounded-lg text-base font-semibold">
            Fazer Novo Pedido
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Obrigado pela preferência!
          </p>
        </div>
      </div>
    </div>
  );
}
