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

const BEBIDAS_ID = 'bebidas';

function HalfHalfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2A10 10 0 0 1 12 22Z" fill="currentColor" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// Tamanho padrao de cada card antes do cliente escolher (8 pedacos, o mais comum) --
// cada pizza tem seu proprio seletor de tamanho no card (pedido do usuario), guardado por
// id em `selectedSizes`. Adicionar rapido e meio a meio sempre usam o tamanho selecionado
// naquele card especifico, nunca um diferente do anunciado (sem susto no carrinho).
const DEFAULT_SIZE_ID: PizzaSizeId = 'oito-pedacos';

// Rotulo curto pro seletor inline do card (linha compacta, sem espaco pro nome completo
// "8 pedacos"/"12 pedacos" ao lado dos botoes de acao) -- PizzaBuilder.tsx continua usando
// o nome completo, ali tem uma tela inteira pra isso.
const SIZE_SHORT_LABEL: Record<PizzaSizeId, string> = {
  brotinho: 'Brotinho',
  'oito-pedacos': '8 ped.',
  'doze-pedacos': '12 ped.',
};

export function Menu({ onAddSingleFlavor, onStartHalfHalf, onAddDrink, cartItemsCount, onViewCart }: MenuProps) {
  const [selectedSizes, setSelectedSizes] = useState<Record<string, PizzaSizeId>>({});

  const sizeFor = (pizzaId: string): PizzaSizeId => selectedSizes[pizzaId] ?? DEFAULT_SIZE_ID;
  const multiplierFor = (pizzaId: string): number =>
    pizzaSizes.find((s) => s.id === sizeFor(pizzaId))?.multiplier ?? 1;

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
    <div className="min-h-dvh bg-background pb-28">
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
                      className="flex items-start gap-3 px-4 py-3.5 border-b border-border last:border-b-0"
                    >
                      <img
                        src={pizza.image}
                        alt={pizza.name}
                        className="w-11 h-11 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-serif font-semibold text-base text-foreground truncate">{pizza.name}</span>
                            {pizza.featured && <Badge className="shrink-0">Especial</Badge>}
                          </div>
                          <span className="font-serif text-sm text-primary shrink-0">
                            {formatCurrency(pizza.price * multiplierFor(pizza.id))}
                          </span>
                        </div>
                        <p className="text-xs text-primary mt-0.5">{pizza.description}</p>
                        <div className="flex items-center justify-between mt-2 gap-1">
                          <div className="flex gap-1">
                            {pizzaSizes.map((size) => {
                              const isSelected = sizeFor(pizza.id) === size.id;
                              return (
                                <button
                                  key={size.id}
                                  onClick={() => setSelectedSizes((prev) => ({ ...prev, [pizza.id]: size.id }))}
                                  className={`px-1.5 py-1 rounded border text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                                    isSelected
                                      ? 'border-primary bg-primary/[.13] text-primary'
                                      : 'border-border text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {SIZE_SHORT_LABEL[size.id]}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => onStartHalfHalf(pizza, sizeFor(pizza.id))}
                              title="Meio a meio"
                              aria-label={`Meio a meio com ${pizza.name}`}
                              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                              <HalfHalfIcon />
                            </button>
                            <button
                              onClick={() => onAddSingleFlavor(pizza, sizeFor(pizza.id))}
                              title="Adicionar"
                              aria-label={`Adicionar ${pizza.name}`}
                              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
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
