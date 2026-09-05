import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { mockTenant, pizzaSizes } from '../data/repository';
import { CartItem } from '@pizza/types';
import { Card, CardContent, Button, formatCurrency } from '@pizza/ui';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onBack: () => void;
  onCheckout: () => void;
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

      <div className="p-5 space-y-3 max-w-md mx-auto">
        {items.map((item) => (
          <Card key={item.id} className="rounded-xl">
            <CardContent className="p-4">
              {item.type === 'pizza' && item.pizza && (
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-3">
                      <h3 className="font-serif font-semibold text-base text-foreground leading-tight mb-1">
                        {item.pizza.flavors.map(f => f.name).join(' + ')}
                      </h3>
                      <p className="text-sm text-primary">
                        Pizza {pizzaSizes.find(s => s.id === item.pizza!.size)?.name ?? item.pizza.size}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-2 text-destructive hover:opacity-80 rounded-full transition-opacity"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-1 bg-background p-1 rounded-lg">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:border-primary/50 text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-semibold w-8 text-center text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:border-primary/50 text-foreground transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-serif text-lg text-primary font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              )}

              {item.type === 'drink' && item.drink && (
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-3">
                      <h3 className="font-semibold text-foreground leading-tight mb-1">{item.drink.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.drink.size}</p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-2 text-destructive hover:opacity-80 rounded-full transition-opacity"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-1 bg-background p-1 rounded-lg">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:border-primary/50 text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-semibold w-8 text-center text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:border-primary/50 text-foreground transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-serif text-lg text-primary font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-5 z-50">
        <div className="max-w-md mx-auto">
          <Card className="mb-4 rounded-xl">
            <CardContent className="p-5 space-y-3">
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
            </CardContent>
          </Card>
          <Button
            fullWidth
            size="lg"
            onClick={onCheckout}
            className="h-14 rounded-lg text-base font-semibold"
          >
            Avançar para o Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
