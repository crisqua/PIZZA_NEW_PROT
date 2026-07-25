import { useState } from 'react';
import { ShoppingCart, Plus, Sparkles } from 'lucide-react';
import { mockPizzas, mockDrinks, mockTenant, Pizza, Drink } from '../../data/mockData';
import { Card, CardContent } from '../Card';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { formatCurrency } from '../../lib/utils';

interface MenuProps {
  onSelectPizza: (pizza: Pizza) => void;
  onAddDrink: (drink: Drink) => void;
  cartItemsCount: number;
  onViewCart: () => void;
}

export function Menu({ onSelectPizza, onAddDrink, cartItemsCount, onViewCart }: MenuProps) {
  const [activeCategory, setActiveCategory] = useState<'todas' | 'salgada' | 'doce' | 'bebidas'>('todas');

  const filteredPizzas = activeCategory === 'bebidas'
    ? []
    : activeCategory === 'todas'
      ? mockPizzas
      : mockPizzas.filter(p => p.category === activeCategory);

  const showDrinks = activeCategory === 'bebidas';

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      <div className="bg-gradient-to-r from-primary via-primary to-orange-500 text-primary-foreground px-6 pt-12 pb-10 rounded-b-[2rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg border-2 border-white/20">
            {mockTenant.logo}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{mockTenant.name}</h1>
            <p className="text-sm font-medium opacity-90 mt-1 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Aberto • Entrega em 40-60 min
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold relative z-10">
          <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-md px-3 py-1.5">
            Pedido mínimo: {formatCurrency(mockTenant.minOrder)}
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-md px-3 py-1.5">
            Taxa: {formatCurrency(mockTenant.deliveryFee)}
          </Badge>
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50 py-3 mt-4">
        <div className="flex gap-3 px-6 overflow-x-auto no-scrollbar scroll-smooth">
          {['todas', 'salgada', 'doce', 'bebidas'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-105'
                  : 'bg-white text-muted-foreground hover:bg-muted/80 shadow-sm border border-border/50'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-5">
        {showDrinks ? (
          <>
            <h2 className="font-bold text-xl text-foreground flex items-center gap-2 mb-4">
              <span className="text-2xl">🥤</span> Bebidas Geladas
            </h2>
            {mockDrinks.map((drink) => (
              <Card key={drink.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">{drink.name}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{drink.size}</p>
                    <p className="text-primary font-extrabold mt-2 text-lg">{formatCurrency(drink.price)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onAddDrink(drink)}
                    className="shrink-0 rounded-full h-10 w-10 p-0 shadow-md shadow-primary/20"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </>
        ) : (
          filteredPizzas.map((pizza) => (
            <Card key={pizza.id} className="overflow-hidden cursor-pointer hover:shadow-xl transition-all border-0 shadow-sm bg-white rounded-3xl group">
              <div onClick={() => onSelectPizza(pizza)}>
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <img
                    src={pizza.image}
                    alt={pizza.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                    {pizza.category === 'especial' && (
                      <Badge className="bg-warning text-warning-foreground border-0 font-bold px-3 py-1 shadow-md w-fit">Especial</Badge>
                    )}
                    <h3 className="font-extrabold text-white text-2xl drop-shadow-md">{pizza.name}</h3>
                  </div>
                </div>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-4 font-medium line-clamp-2 leading-relaxed">{pizza.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">A partir de</span>
                      <span className="text-primary font-extrabold text-xl">
                        {formatCurrency(pizza.price * 0.75)}
                      </span>
                    </div>
                    <Button size="sm" className="rounded-full px-6 shadow-md shadow-primary/20 font-bold">
                      Montar
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))
        )}
      </div>

      {cartItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-border/50 z-50">
          <Button
            fullWidth
            size="lg"
            onClick={onViewCart}
            className="relative h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4"
          >
            <div className="absolute left-6 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">
              {cartItemsCount}
            </div>
            Ver Carrinho
            <ShoppingCart className="w-5 h-5 absolute right-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
