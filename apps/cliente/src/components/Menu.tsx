import { useState } from 'react';
import { ShoppingCart, Plus } from 'lucide-react';
import { mockPizzas, mockDrinks, mockTenant, mockCategories, pizzaSizes } from '../data/repository';
import { Pizza, Drink, PizzaSizeId } from '@pizza/types';
import { Card, CardContent, Button, Badge, formatCurrency } from '@pizza/ui';

interface MenuProps {
  onAddSingleFlavor: (pizza: Pizza, size: PizzaSizeId) => void;
  onStartHalfHalf: (pizza: Pizza, size: PizzaSizeId) => void;
  onAddDrink: (drink: Drink) => void;
  cartItemsCount: number;
  onViewCart: () => void;
}

const DEFAULT_SIZE_INDEX = 1; // "8 pedaços" — meio-termo entre Brotinho e 12 pedaços

export function Menu({ onAddSingleFlavor, onStartHalfHalf, onAddDrink, cartItemsCount, onViewCart }: MenuProps) {
  const categoryTabs = ['todas', ...mockCategories.map(c => c.id), 'bebidas'];
  const [activeCategory, setActiveCategory] = useState<string>('todas');
  const [selectedSizeByPizza, setSelectedSizeByPizza] = useState<Record<string, PizzaSizeId>>({});

  const filteredPizzas = activeCategory === 'bebidas'
    ? []
    : activeCategory === 'todas'
      ? mockPizzas
      : mockPizzas.filter(p => p.category === activeCategory);

  const showDrinks = activeCategory === 'bebidas';

  const categoryLabel = (id: string) => {
    if (id === 'todas') return 'Todas';
    if (id === 'bebidas') return 'Bebidas';
    return mockCategories.find(c => c.id === id)?.name ?? id;
  };

  const getSelectedSize = (pizzaId: string) =>
    pizzaSizes.find(s => s.id === selectedSizeByPizza[pizzaId]) ?? pizzaSizes[DEFAULT_SIZE_INDEX];

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-surface px-6 pt-12 pb-8 border-b border-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-serif font-semibold text-lg">
            {mockTenant.logo}
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">{mockTenant.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
              Aberto • Entrega em 40-60 min
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>Pedido mínimo {formatCurrency(mockTenant.minOrder)}</Badge>
          <Badge>Taxa {formatCurrency(mockTenant.deliveryFee)}</Badge>
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border py-3">
        <div className="flex gap-2 px-6 overflow-x-auto no-scrollbar scroll-smooth">
          {categoryTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded text-sm font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              }`}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-4">
        {showDrinks ? (
          <>
            <h2 className="font-serif text-lg text-foreground mb-2">Bebidas Geladas</h2>
            {mockDrinks.map((drink) => (
              <Card key={drink.id} className="rounded-xl">
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{drink.name}</h3>
                    <p className="text-sm text-muted-foreground">{drink.size}</p>
                    <p className="font-serif text-primary font-semibold mt-1 text-lg">{formatCurrency(drink.price)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onAddDrink(drink)}
                    className="shrink-0 rounded-full h-10 w-10 p-0"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </>
        ) : (
          filteredPizzas.map((pizza) => {
            const selectedSize = getSelectedSize(pizza.id);
            return (
              <Card key={pizza.id} className="rounded-xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <img
                      src={pizza.image}
                      alt={pizza.name}
                      className="w-[76px] h-[76px] rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h3 className="font-serif text-lg text-foreground leading-tight">{pizza.name}</h3>
                        {pizza.featured && <Badge className="shrink-0">Especial</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pizza.description}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {pizzaSizes.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSizeByPizza(prev => ({ ...prev, [pizza.id]: size.id }))}
                        className={`flex-1 py-2 px-1 rounded border text-center transition-colors ${
                          selectedSize.id === size.id
                            ? 'border-primary bg-primary/[.13] text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="block text-xs font-semibold uppercase tracking-wide">{size.name}</span>
                        <span className="block font-serif text-sm mt-0.5">{formatCurrency(pizza.price * size.multiplier)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded"
                      onClick={() => onStartHalfHalf(pizza, selectedSize.id)}
                    >
                      Meio a meio
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded"
                      onClick={() => onAddSingleFlavor(pizza, selectedSize.id)}
                    >
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {cartItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border z-50">
          <Button
            fullWidth
            size="lg"
            onClick={onViewCart}
            className="relative h-14 rounded-lg text-base font-semibold flex items-center justify-center gap-3"
          >
            <div className="absolute left-6 w-7 h-7 bg-primary-foreground/20 rounded-full flex items-center justify-center text-sm">
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
