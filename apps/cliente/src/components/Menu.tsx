import { useState } from 'react';
import { ShoppingCart, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { mockPizzas, mockDrinks, mockTenant, mockCategories, pizzaSizes } from '../data/repository';
import { Pizza, Drink, PizzaSizeId } from '@pizza/types';
import { Card, Button, Badge, formatCurrency } from '@pizza/ui';

interface MenuProps {
  onAddSingleFlavor: (pizza: Pizza, size: PizzaSizeId) => void;
  onStartHalfHalf: (pizza: Pizza, size: PizzaSizeId) => void;
  onAddDrink: (drink: Drink) => void;
  cartItemsCount: number;
  onViewCart: () => void;
}

const DEFAULT_SIZE_INDEX = 1; // "8 pedaços" — meio-termo entre Brotinho e 12 pedaços
const BEBIDAS_ID = 'bebidas';

function HalfHalfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2A10 10 0 0 1 12 22Z" fill="currentColor" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Menu({ onAddSingleFlavor, onStartHalfHalf, onAddDrink, cartItemsCount, onViewCart }: MenuProps) {
  const [selectedSizeId, setSelectedSizeId] = useState<PizzaSizeId>(pizzaSizes[DEFAULT_SIZE_INDEX].id);
  const selectedSize = pizzaSizes.find((s) => s.id === selectedSizeId) ?? pizzaSizes[DEFAULT_SIZE_INDEX];

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { [BEBIDAS_ID]: false };
    mockCategories.forEach((category, index) => {
      initial[category.id] = index === 0;
    });
    return initial;
  });

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

      <div className="bg-surface px-6 pt-4 pb-4 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tamanho</span>
        <div className="flex gap-2 mt-2">
          {pizzaSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => setSelectedSizeId(size.id)}
              className={`flex-1 py-2 px-1 rounded border text-center transition-colors ${
                selectedSize.id === size.id
                  ? 'border-primary bg-primary/[.13] text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="block text-xs font-semibold uppercase tracking-wide">{size.name}</span>
              <span className="block text-[11px] mt-0.5">{size.slices} pedaços</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-3">
        {mockCategories.map((category) => {
          const pizzas = mockPizzas.filter((p) => p.category === category.id);
          if (pizzas.length === 0) return null;
          const isOpen = !!openCategories[category.id];

          return (
            <Card key={category.id} className="overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between px-4 py-4"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-serif text-lg text-foreground">{category.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {pizzas.length}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border">
                  {pizzas.map((pizza) => (
                    <div
                      key={pizza.id}
                      className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-b-0"
                    >
                      <img
                        src={pizza.image}
                        alt={pizza.name}
                        className="w-11 h-11 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif text-[15px] text-foreground truncate">{pizza.name}</span>
                          {pizza.featured && <Badge className="shrink-0">Especial</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{pizza.description}</p>
                        <span className="block font-serif text-sm text-primary mt-1">
                          {formatCurrency(pizza.price * selectedSize.multiplier)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onStartHalfHalf(pizza, selectedSize.id)}
                          title="Meio a meio"
                          aria-label={`Meio a meio com ${pizza.name}`}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <HalfHalfIcon />
                        </button>
                        <button
                          onClick={() => onAddSingleFlavor(pizza, selectedSize.id)}
                          title="Adicionar"
                          aria-label={`Adicionar ${pizza.name}`}
                          className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}

        <Card className="overflow-hidden">
          <button
            onClick={() => toggleCategory(BEBIDAS_ID)}
            className="w-full flex items-center justify-between px-4 py-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-lg text-foreground">Bebidas</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {mockDrinks.length}
              </span>
            </div>
            {openCategories[BEBIDAS_ID] ? (
              <ChevronUp className="w-5 h-5 text-primary shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
          </button>

          {openCategories[BEBIDAS_ID] && (
            <div className="border-t border-border">
              {mockDrinks.map((drink) => (
                <div
                  key={drink.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border last:border-b-0"
                >
                  <div className="min-w-0">
                    <span className="font-serif text-[15px] text-foreground">{drink.name}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {drink.size} · {formatCurrency(drink.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => onAddDrink(drink)}
                    title="Adicionar"
                    aria-label={`Adicionar ${drink.name}`}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
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
