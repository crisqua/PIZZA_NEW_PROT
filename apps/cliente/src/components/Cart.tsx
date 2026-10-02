import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { mockTenant, pizzaSizes } from '../data/repository';
import { CartItem } from '@pizza/types';
import { Button, formatCurrency } from '@pizza/ui';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onBack: () => void;
  onCheckout: () => void;
}

// Nome/subtitulo variam por tipo de item, o resto da linha (remover, stepper, total)
// e' identico -- antes triplicado em 3 blocos JSX quase iguais, agora resolvido aqui
// uma vez so' (PROTCLINEW, Sprint 5). Pizza mostra o tamanho em dourado (destaque ja'
// existente), bebida/sobremesa em cinza -- mesma distincao que ja' havia antes.
function resolveItemDisplay(item: CartItem): { name: string; subtitle: string; subtitleTone: 'primary' | 'muted' } {
  if (item.type === 'pizza' && item.pizza) {
    return {
      name: item.pizza.flavors.map((f) => f.name).join(' + '),
      subtitle: `Pizza ${pizzaSizes.find((s) => s.id === item.pizza!.size)?.name ?? item.pizza.size}`,
      subtitleTone: 'primary',
    };
  }
  if (item.type === 'drink' && item.drink) {
    return { name: item.drink.name, subtitle: item.drink.size, subtitleTone: 'muted' };
  }
  if (item.type === 'sobremesa' && item.sobremesa) {
    return { name: item.sobremesa.name, subtitle: item.sobremesa.size, subtitleTone: 'muted' };
  }
  return { name: '', subtitle: '', subtitleTone: 'muted' };
}

export function Cart({ items, onUpdateQuantity, onRemoveItem, onBack, onCheckout }: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = mockTenant.deliveryFee;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <button onClick={onBack} className="p-2 hover:bg-card text-foreground rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-serif text-xl text-foreground">Seu Carrinho</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-card border border-border rounded-full flex items-center justify-center mb-6">
            <ShoppingCart className="w-9 h-9 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-3">Carrinho Vazio</h2>
          <p className="text-muted-foreground mb-8">
            Bateu aquela fome? Adicione deliciosas pizzas e bebidas para continuar seu pedido.
          </p>
          <Button onClick={onBack} size="lg" className="rounded-lg px-8">
            Ver Cardápio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-72">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border p-4">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button onClick={onBack} className="p-2 hover:bg-card text-foreground rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-xl text-foreground">Seu Carrinho <span className="text-primary">({items.length})</span></h1>
        </div>
      </div>

      <div className="p-5 max-w-md mx-auto">
        {items.map((item) => {
          const { name, subtitle, subtitleTone } = resolveItemDisplay(item);
          return (
            <div key={item.id} className="py-6 border-b border-border last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-semibold text-base text-foreground leading-tight">{name}</h3>
                  <p className={`text-sm mt-1 ${subtitleTone === 'primary' ? 'text-primary' : 'text-muted-foreground'}`}>{subtitle}</p>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  aria-label={`Remover ${name}`}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label="Diminuir quantidade"
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-foreground w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    aria-label="Aumentar quantidade"
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="font-serif text-lg font-semibold text-primary">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-5 z-50">
        <div className="max-w-md mx-auto">
          <div className="border border-border rounded-2xl p-5 mb-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/90">Subtotal</span>
              <span className="text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/90">Taxa de entrega</span>
              <span className="text-foreground">{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex items-end justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-serif text-2xl text-primary font-semibold">{formatCurrency(total)}</span>
            </div>
          </div>
          <Button
            fullWidth
            size="lg"
            onClick={onCheckout}
            disabled={!mockTenant.isOpen}
            className="h-14 rounded-lg text-base font-semibold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mockTenant.isOpen ? 'Avançar para o Checkout' : 'Pizzaria fechada no momento'}
          </Button>
        </div>
      </div>
    </div>
  );
}
