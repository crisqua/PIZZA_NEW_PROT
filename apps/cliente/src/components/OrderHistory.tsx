import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getMyOrdersLastDays, ApiOrder } from '../data/repository';
import { Badge, formatCurrency } from '@pizza/ui';
import { STATUS_LABEL, statusVariant, formatOrderDate, summarizeItems } from './orderDisplay';

interface OrderHistoryProps {
  onBack: () => void;
  onOpenOrder: (order: ApiOrder) => void;
}

const PERIODS = [7, 30, 90] as const;

// Historico de pedidos do cliente logado. GET /orders exige periodo (sprint "Desempenho
// Sistema") -- mesmo padrao de pills 7/30/90 dias do Financeiro/Vendas por Pizzaria.
export function OrderHistory({ onBack, onOpenOrder }: OrderHistoryProps) {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getMyOrdersLastDays(days)
      .then((result) => {
        if (!cancelled) setOrders(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="min-h-dvh bg-background pb-10">
      <div className="bg-surface border-b border-border px-6 pt-6 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="font-serif text-2xl text-foreground">Histórico de pedidos</h1>
        <div className="flex gap-2 mt-4">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                days === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pt-5 max-w-md mx-auto space-y-3">
        {loading && <p className="text-sm text-muted-foreground text-center py-8">Carregando pedidos...</p>}
        {!loading && error && (
          <p className="text-sm text-destructive text-center py-8">Não foi possível carregar seus pedidos. Tente novamente.</p>
        )}
        {!loading && !error && orders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido nos últimos {days} dias.</p>
        )}
        {!loading &&
          !error &&
          orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => onOpenOrder(order)}
              className="w-full text-left border border-border rounded-xl p-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    #{order.orderCode} · {formatOrderDate(order.createdAt)}
                  </span>
                  <Badge variant={statusVariant(order.status)}>{STATUS_LABEL[order.status]}</Badge>
                </div>
                <p className="text-sm text-foreground mt-1.5 truncate">{summarizeItems(order)}</p>
                <p className="font-serif text-primary font-semibold mt-1">{formatCurrency(order.total)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
      </div>
    </div>
  );
}
