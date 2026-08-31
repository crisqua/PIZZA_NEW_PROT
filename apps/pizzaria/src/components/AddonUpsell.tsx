import { Lock } from 'lucide-react';
import { Addon } from '@pizza/types';
import { Card, CardContent, formatCurrency } from '@pizza/ui';

interface AddonUpsellProps {
  addon: Addon;
}

// Liberacao real agora vem do plano/assinatura de verdade (Sprint 9) -- sem fluxo de
// compra in-app (sem pagamento online, fora do MVP), entao nao ha' mais um botao que
// finge ativar o modulo. Contratar/cancelar um add-on e' uma acao comercial, fora do
// proprio painel do tenant (fica com a plataforma, Sprint 10 admin-pizzarias).
export function AddonUpsell({ addon }: AddonUpsellProps) {
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
          <p className="text-sm text-muted-foreground border border-border rounded-lg px-4 py-3">
            Módulo não incluído no seu plano atual. Fale com o suporte para contratar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
