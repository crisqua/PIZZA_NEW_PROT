import { CheckCircle2 } from 'lucide-react';
import { Button } from '../Button';
import { Card, CardContent } from '../Card';
import { Badge } from '../Badge';
import { formatCurrency } from '../../lib/utils';

interface OrderConfirmationProps {
  orderId: string;
  total: number;
  estimatedTime: string;
  onBackToMenu: () => void;
}

export function OrderConfirmation({ orderId, total, estimatedTime, onBackToMenu }: OrderConfirmationProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground">
            Seu pedido foi enviado com sucesso via WhatsApp
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Número do pedido</span>
              <Badge variant="secondary" className="text-base px-3 py-1.5">
                #{orderId}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-bold text-xl text-primary">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tempo estimado</span>
              <Badge variant="warning">{estimatedTime}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Próximos passos</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">1.</span>
                <span>Aguarde a confirmação do restaurante no WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">2.</span>
                <span>Prepare o pagamento conforme solicitado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">3.</span>
                <span>Acompanhe a entrega pelo WhatsApp</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button fullWidth size="lg" onClick={onBackToMenu}>
            Fazer Novo Pedido
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Obrigado pela preferência! 🍕
          </p>
        </div>
      </div>
    </div>
  );
}
