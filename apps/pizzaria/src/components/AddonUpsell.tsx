import { Lock } from 'lucide-react';
import { Addon } from '@pizza/types';
import { Card, CardContent, Button, formatCurrency } from '@pizza/ui';

interface AddonUpsellProps {
  addon: Addon;
  onActivate: () => void;
}

export function AddonUpsell({ addon, onActivate }: AddonUpsellProps) {
  return (
    <div className="p-6 flex items-center justify-center min-h-[calc(100vh-2rem)]">
      <Card className="max-w-md w-full rounded-xl">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-primary/[.13] border border-primary/[.27] rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-2">{addon.name}</h2>
          <p className="text-muted-foreground mb-6">{addon.description}</p>
          <div className="flex items-end justify-center gap-1 mb-6">
            <span className="font-serif text-3xl text-primary font-semibold">{formatCurrency(addon.price)}</span>
            <span className="text-muted-foreground mb-1">/mês</span>
          </div>
          <Button size="lg" fullWidth onClick={onActivate} className="h-12 rounded-lg">
            Contratar módulo
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Pacote opcional, cobrado à parte do seu plano atual. Pode cancelar quando quiser em Configurações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
