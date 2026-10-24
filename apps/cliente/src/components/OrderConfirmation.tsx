import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getOrder, isFinalStatus, ApiOrder, ApiOrderStatus } from '../data/repository';
import { Button, Badge, formatCurrency } from '@pizza/ui';
import { STATUS_LABEL, statusVariant, formatOrderDate } from './orderDisplay';

interface OrderConfirmationProps {
  // Caminho do checkout (campos soltos, como sempre foi). Quando `order` vem, ele manda
  // e estes viram so' fallback.
  orderId?: string;
  // Codigo sequencial por pizzaria/dia ("AAAAMMDDNNNN") -- opcional so' defensivamente,
  // toda resposta nova da API ja' vem com ele; fallback pro slice do UUID antigo cobre
  // so' o caso (nao esperado) de vir undefined.
  orderCode?: string;
  total?: number;
  estimatedTime?: string;
  customerName?: string;
  // Modo "detalhe" (historico / peca novamente / acompanhe meus pedidos): recebe o
  // pedido completo da API em vez de campos soltos. Muda o cabecalho e mostra os itens.
  order?: ApiOrder;
  heading?: string;
  backLabel?: string;
  onBackToMenu: () => void;
}

const POLL_INTERVAL_MS = 10_000;

// Acompanhamento do proprio pedido via polling (Sprint 7, MVP.md item 9 -- "Cliente
// acompanha status do proprio pedido via polling"; WebSocket e' Fase 3, fora do MVP).
// O polling PARA sozinho assim que o pedido chega em estado final (completed/cancelled)
// -- antes, a tela ficava batendo na API pra sempre mesmo com o pedido ja' encerrado.
export function OrderConfirmation({
  orderId,
  orderCode,
  total,
  estimatedTime,
  customerName,
  order,
  heading,
  backLabel,
  onBackToMenu,
}: OrderConfirmationProps) {
  const isDetail = !!order;
  const id = order?.id ?? orderId ?? '';
  const code = order?.orderCode ?? orderCode;
  const totalValue = order?.total ?? total ?? 0;
  const [status, setStatus] = useState<ApiOrderStatus>(order?.status ?? 'pending');

  useEffect(() => {
    if (!id) return;
    // Pedido que ja' chegou encerrado (ex.: aberto pelo historico) nao precisa de polling.
    if (order && isFinalStatus(order.status)) {
      setStatus(order.status);
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const fresh = await getOrder(id);
        if (cancelled) return;
        setStatus(fresh.status);
        if (isFinalStatus(fresh.status) && interval) {
          clearInterval(interval);
          interval = undefined;
        }
      } catch {
        // Rede instavel/token expirado -- so' tenta de novo no proximo tick, sem quebrar a tela.
      }
    };

    poll();
    interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
    // `order` entra so' pelo status inicial -- o id e' o que identifica o pedido acompanhado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addressLine = order
    ? [order.address, order.addressNumber, order.complement, order.neighborhood].filter(Boolean).join(', ')
    : '';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          {isDetail ? (
            <>
              <h1 className="font-serif text-2xl text-foreground mb-1">{heading ?? `Pedido #${code ?? id.slice(0, 8)}`}</h1>
              {order && <p className="text-sm text-muted-foreground">{formatOrderDate(order.createdAt)}</p>}
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-success/10 border border-success/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-11 h-11 text-success" />
              </div>
              <h1 className="font-serif text-2xl text-foreground mb-2">
                {customerName ? `Valeu, ${customerName}!` : 'Pedido Confirmado!'}
              </h1>
              <p className="text-muted-foreground">Seu pedido foi recebido e ja esta sendo acompanhado pela pizzaria</p>
            </>
          )}
        </div>

        <div className="border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Número do pedido</span>
            <Badge className="text-sm px-3 py-1.5">#{code ?? id.slice(0, 8)}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={statusVariant(status)}>{STATUS_LABEL[status]}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor total</span>
            <span className="font-serif text-xl text-primary font-semibold">{formatCurrency(totalValue)}</span>
          </div>
          {!isDetail && estimatedTime && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tempo estimado</span>
              <Badge variant="warning">{estimatedTime}</Badge>
            </div>
          )}
        </div>

        {isDetail && order && order.items.length > 0 && (
          <div className="border border-border rounded-2xl p-6">
            <h3 className="font-serif font-semibold text-foreground mb-3">Itens</h3>
            <ul className="space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <span className="text-foreground">
                    {item.quantity}x {item.name}
                    {item.size ? <span className="text-muted-foreground"> · {item.size}</span> : null}
                  </span>
                  <span className="text-muted-foreground shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
              {typeof order.deliveryFee === 'number' && order.deliveryFee > 0 && (
                <li className="flex items-start justify-between gap-3 text-muted-foreground">
                  <span>Taxa de entrega</span>
                  <span className="shrink-0">{formatCurrency(order.deliveryFee)}</span>
                </li>
              )}
            </ul>
            {addressLine && <p className="text-xs text-muted-foreground mt-4">Entrega em: {addressLine}</p>}
          </div>
        )}

        {!isDetail && (
          <div className="border border-border rounded-2xl p-6">
            <h3 className="font-serif font-semibold text-foreground mb-3">Próximos passos</h3>
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
          </div>
        )}

        <div className="space-y-3">
          <Button fullWidth size="lg" onClick={onBackToMenu} className="h-14 rounded-lg text-base font-semibold uppercase tracking-wide">
            {backLabel ?? 'Fazer Novo Pedido'}
          </Button>
          {!isDetail && <p className="text-center text-sm text-muted-foreground">Obrigado pela preferência!</p>}
        </div>
      </div>
    </div>
  );
}
