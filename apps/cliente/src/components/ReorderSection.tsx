import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { getMyOrdersLastDays, ApiOrder } from '../data/repository';
import { Badge, formatCurrency } from '@pizza/ui';
import { SectionDivider } from './SectionDivider';
import { STATUS_LABEL, statusVariant, formatOrderDate, summarizeItems } from './orderDisplay';

interface ReorderSectionProps {
  onOpenOrder: (order: ApiOrder) => void;
}

const RECENT_WINDOW_DAYS = 30;
const MAX_CARDS = 2;

// Binding de modulo (mesmo padrao de mockPizzas/mockCategories em repository.ts) --
// sobrevive a remontagem do componente. Bug real reportado pelo usuario: Menu.tsx
// remonta inteiro (key={authVersion}-${catalogVersion} em App.tsx) toda vez que a aba
// volta a ficar em foco, pra sempre refletir preco/produto atualizado -- antes disso
// era inofensivo, mas com "Peca novamente" existindo, cada remontagem fazia a secao
// comecar vazia de novo e so reaparecer depois que a busca terminasse (pisca-pisca
// visivel). Guardando o ultimo resultado aqui, uma remontagem reusa o que ja tinha
// (sem sumir da tela) e so revalida em segundo plano.
let cachedOrders: ApiOrder[] = [];

// "Peca novamente" no topo do Cardapio: os 2 pedidos mais recentes do cliente logado.
// So' renderiza se houver pelo menos 1 pedido (e so' e' montada com o cliente logado --
// Menu.tsx controla isso). Por ora o card abre o DETALHE do pedido; recriar o carrinho
// com 1 toque ficou de fora de proposito (precos/disponibilidade podem ter mudado).
// Falha de rede e' silenciosa: e' um atalho, nunca pode atrapalhar o cardapio.
export function ReorderSection({ onOpenOrder }: ReorderSectionProps) {
  const [orders, setOrders] = useState<ApiOrder[]>(cachedOrders);

  useEffect(() => {
    let cancelled = false;
    getMyOrdersLastDays(RECENT_WINDOW_DAYS)
      .then((result) => {
        const next = result.slice(0, MAX_CARDS);
        cachedOrders = next;
        if (!cancelled) setOrders(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (orders.length === 0) return null;

  return (
    <div className="pt-7">
      <SectionDivider label="PEÇA NOVAMENTE" />
      <div className="mt-4 space-y-3">
        {orders.map((order) => (
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
              <p className="text-sm text-foreground mt-1.5 truncate">{summarizeItems(order) || 'Ver detalhes do pedido'}</p>
              <p className="font-serif text-primary font-semibold mt-1">{formatCurrency(order.total)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
