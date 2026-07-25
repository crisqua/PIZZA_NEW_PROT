import { useState } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { CartItem, mockTenant } from '../../data/mockData';
import { Card, CardContent } from '../Card';
import { Button } from '../Button';
import { formatCurrency } from '../../lib/utils';

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
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/50 p-4 shadow-sm">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <button onClick={onBack} className="p-2.5 bg-muted/50 hover:bg-muted text-foreground rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-extrabold text-xl tracking-tight">Seu Carrinho</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <ShoppingCart className="w-12 h-12 text-primary/40" />
          </div>
          <h2 className="text-2xl font-extrabold mb-3 text-foreground">Carrinho Vazio</h2>
          <p className="text-muted-foreground text-base mb-8 font-medium px-4">
            Bateu aquela fome? Adicione deliciosas pizzas e bebidas para continuar seu pedido.
          </p>
          <Button onClick={onBack} size="lg" className="rounded-full px-8 font-bold shadow-md shadow-primary/20">
            Ver Cardápio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-72">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/50 p-4 shadow-sm">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button onClick={onBack} className="p-2.5 bg-muted/50 hover:bg-muted text-foreground rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-xl tracking-tight">Seu Carrinho <span className="text-primary ml-1">({items.length})</span></h1>
        </div>
      </div>

      <div className="p-5 space-y-4 max-w-md mx-auto">
        {items.map((item) => (
          <Card key={item.id} className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {item.type === 'pizza' && item.pizza && (
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-3">
                      <h3 className="font-bold text-foreground text-lg leading-tight mb-1">
                        Pizza {item.pizza.size.charAt(0).toUpperCase() + item.pizza.size.slice(1)}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        {item.pizza.flavors.map(f => f.name).join(' + ')}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-2.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/50 pt-4">
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-border/50 rounded-lg hover:border-primary/50 text-foreground disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-8 text-center text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-border/50 rounded-lg hover:border-primary/50 text-foreground transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-extrabold text-xl text-primary">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              )}

              {item.type === 'drink' && item.drink && (
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-3">
                      <h3 className="font-bold text-foreground text-lg leading-tight mb-1">{item.drink.name}</h3>
                      <p className="text-sm text-muted-foreground font-medium">{item.drink.size}</p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-2.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/50 pt-4">
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-border/50 rounded-lg hover:border-primary/50 text-foreground disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-8 text-center text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-border/50 rounded-lg hover:border-primary/50 text-foreground transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-extrabold text-xl text-primary">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-border/50 p-5 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-md mx-auto">
          <Card className="mb-5 border-0 bg-gradient-to-br from-primary/5 to-accent/30 rounded-2xl shadow-inner">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span className="text-foreground">{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="h-px bg-primary/10 my-3" />
              <div className="flex items-end justify-between">
                <span className="font-bold text-lg text-foreground">Total</span>
                <span className="text-3xl font-extrabold text-primary drop-shadow-sm">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>
          <Button 
            fullWidth 
            size="lg" 
            onClick={onCheckout}
            className="h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/30"
          >
            Avançar para o Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
