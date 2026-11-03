import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { getMyOrdersLastDays, ApiOrder } from '../data/repository';
import { Badge } from '@pizza/ui';
import { SectionDivider } from './SectionDivider';
import { STATUS_LABEL, statusVariant, formatOrderDate } from './orderDisplay';

interface ReorderSectionProps {
  onOpenOrder: (order: ApiOrder) => void;
}

const RECENT_WINDOW_DAYS = 30;
const MAX_CARDS = 5;
const MIN_THUMB_PCT = 15;

// Binding de modulo (mesmo padrao de mockPizzas/mockCategories em repository.ts) --
// sobrevive a remontagem do componente. Bug real reportado pelo usuario: Menu.tsx
// remonta inteiro (key={authVersion}-${catalogVersion} em App.tsx) toda vez que a aba
// volta a ficar em foco, pra sempre refletir preco/produto atualizado -- antes disso
// era inofensivo, mas com "Peca novamente" existindo, cada remontagem fazia a secao
// comecar vazia de novo e so reaparecer depois que a busca terminasse (pisca-pisca
// visivel). Guardando o ultimo resultado aqui, uma remontagem reusa o que ja tinha
// (sem sumir da tela) e so revalida em segundo plano.
let cachedOrders: ApiOrder[] = [];

// "Peca novamente" no topo do Cardapio: ate 5 pedidos mais recentes dos ultimos 30
// dias do cliente logado -- so' um atalho rapido, o historico completo com filtros
// fica na tela "Historico de pedidos" (OrderHistory.tsx). So' renderiza se houver pelo
// menos 1 pedido (e so' e' montada com o cliente logado -- Menu.tsx controla isso).
// Por ora o card abre o DETALHE do pedido; recriar o carrinho com 1 toque ficou de
// fora de proposito (precos/disponibilidade podem ter mudado). Falha de rede e'
// silenciosa: e' um atalho, nunca pode atrapalhar o cardapio.
export function ReorderSection({ onOpenOrder }: ReorderSectionProps) {
  const [orders, setOrders] = useState<ApiOrder[]>(cachedOrders);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ widthPct: 100, leftPct: 0 });

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

  // Barra fina embaixo do carrossel: reflete quanto da lista esta visivel e a posicao
  // do scroll, e TAMBEM funciona como scrollbar de verdade -- clicar nela pula pra
  // posicao, arrastar rola junto. Necessario pra quem usa mouse sem touch/trackpad
  // horizontal: a scrollbar nativa foi escondida de proposito (ver .no-scrollbar),
  // entao sem isso nao haveria nenhum jeito de navegar via clique/arrasto.
  const updateThumb = () => {
    const el = scrollerRef.current;
    if (!el || el.scrollWidth <= 0) return;
    const widthPct = Math.max(Math.min(100, (el.clientWidth / el.scrollWidth) * 100), MIN_THUMB_PCT);
    const maxScroll = el.scrollWidth - el.clientWidth;
    const scrollPct = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
    setThumb({ widthPct, leftPct: scrollPct * (100 - widthPct) });
  };

  useEffect(() => {
    updateThumb();
  }, [orders]);

  const seekToClientX = (clientX: number) => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    const rect = track.getBoundingClientRect();
    const pct = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    scroller.scrollLeft = pct * (scroller.scrollWidth - scroller.clientWidth);
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    // O scroll-snap (snap-x snap-mandatory, pros cards travarem de 2 em 2) briga com
    // scrollLeft setado via script durante um arrasto continuo -- o navegador tenta
    // "puxar" de volta pro ponto de snap mais proximo a cada ajuste, travando o
    // arrasto da barra (achado real do usuario: "trava, nao desliza"). Desliga o
    // snap so' enquanto o dedo/mouse esta arrastando a barra e devolve no fim.
    if (scroller) scroller.style.scrollSnapType = 'none';
    seekToClientX(e.clientX);
    const onMove = (ev: PointerEvent) => seekToClientX(ev.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (scroller) scroller.style.scrollSnapType = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (orders.length === 0) return null;

  return (
    <div className="pt-7">
      <SectionDivider label="PEÇA NOVAMENTE" />
      <div
        ref={scrollerRef}
        onScroll={updateThumb}
        className="mt-4 flex gap-2 overflow-x-auto -mx-6 px-6 snap-x snap-mandatory no-scrollbar"
      >
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => onOpenOrder(order)}
            className="shrink-0 basis-[calc(50%-4px)] min-w-0 snap-start text-left border border-border rounded-lg p-2 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center justify-between gap-1">
              <Badge variant={statusVariant(order.status)} className="px-1.5 py-0.5 text-[9px]">
                {STATUS_LABEL[order.status]}
              </Badge>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            </div>
            <p className="text-[11px] font-semibold text-foreground mt-1 truncate">Pedido #{order.orderCode}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Data: {formatOrderDate(order.createdAt)}</p>
            {order.items?.length ? (
              order.items.map((item) => (
                <p key={item.id} className="text-[10px] text-foreground mt-0.5 truncate">
                  {item.quantity}x {item.name}
                </p>
              ))
            ) : (
              <p className="text-[10px] text-foreground mt-0.5">Ver detalhes do pedido</p>
            )}
          </button>
        ))}
      </div>
      {orders.length > 2 && (
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          className="mt-2.5 mx-6 h-2.5 flex items-center cursor-pointer touch-none"
        >
          <div className="w-full h-[3px] bg-border rounded-full relative overflow-hidden">
            <div
              className="absolute inset-y-0 bg-primary rounded-full pointer-events-none"
              style={{ width: `${thumb.widthPct}%`, left: `${thumb.leftPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
