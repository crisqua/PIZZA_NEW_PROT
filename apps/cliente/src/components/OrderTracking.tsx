import { useEffect, useState } from 'react';
import { ArrowLeft, PackageOpen } from 'lucide-react';
import { getActiveOrder, ApiOrder } from '../data/repository';
import { Button } from '@pizza/ui';
import { OrderConfirmation } from './OrderConfirmation';

interface OrderTrackingProps {
  onBack: () => void;
  onOpenHistory: () => void;
}

// "Acompanhe meus pedidos": nao depende mais do estado em memoria do App (que se perdia a
// cada F5) -- busca o pedido ativo no servidor (mais recente que ainda nao terminou,
// janela de 2 dias) e reaproveita a tela de detalhe/polling de OrderConfirmation.
export function OrderTracking({ onBack, onOpenHistory }: OrderTrackingProps) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveOrder()
      .then((result) => {
        if (!cancelled) setOrder(result);
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
  }, []);

  if (!loading && !error && order) {
    return (
      <OrderConfirmation
        order={order}
        heading="Acompanhe seu pedido"
        backLabel="Voltar ao cardápio"
        onBackToMenu={onBack}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 text-center">
      <button
        type="button"
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      {loading ? (
        <p className="text-sm text-muted-foreground">Buscando seu pedido...</p>
      ) : error ? (
        <p className="text-sm text-destructive">Não foi possível carregar seu pedido. Tente novamente.</p>
      ) : (
        <div className="max-w-xs space-y-4">
          <PackageOpen className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="font-serif text-xl text-foreground">Nenhum pedido em andamento</h1>
          <p className="text-sm text-muted-foreground">Quando você fizer um pedido, ele aparece aqui em tempo real.</p>
          <Button variant="outline" onClick={onOpenHistory}>
            Ver histórico de pedidos
          </Button>
        </div>
      )}
    </div>
  );
}
