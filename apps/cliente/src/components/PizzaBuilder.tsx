import { useState } from 'react';
import { ArrowLeft, Plus, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { pizzaSizes, mockPizzas, mockCategories } from '../data/repository';
import { Pizza, PizzaSizeId, priceForSize } from '@pizza/types';
import { Card, CardContent, Button, Badge, formatCurrency } from '@pizza/ui';

interface PizzaBuilderProps {
  initialPizza: Pizza;
  initialSize: PizzaSizeId;
  onBack: () => void;
  onAddToCart: (pizza: { size: PizzaSizeId; flavors: Pizza[]; price: number }) => void;
}

export function PizzaBuilder({ initialPizza, initialSize, onBack, onAddToCart }: PizzaBuilderProps) {
  // Seletor de tamanho inline (design "Cardapio Combos Enxuto"): a barra de tamanho do
  // Menu foi removida, entao a troca de tamanho -- que antes acontecia voltando pro Menu
  // e mexendo naquela barra -- agora precisa acontecer aqui dentro, ja' que e' o unico
  // lugar que ainda oferece controle de tamanho no fluxo de pizza.
  const [selectedSizeId, setSelectedSizeId] = useState<PizzaSizeId>(initialSize);
  const selectedSize = pizzaSizes.find(s => s.id === selectedSizeId) ?? pizzaSizes[1];
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [selectedFlavors, setSelectedFlavors] = useState<Pizza[]>([initialPizza]);
  const [showFlavorSelector, setShowFlavorSelector] = useState(false);

  const canAddFlavor = selectedFlavors.length < 2;

  // Media dos precos DE CADA SABOR ja' no tamanho selecionado -- sem multiplicador
  // (revertido nesta sprint), mesma logica de OrdersService.insertOrder no backend
  // (precisa bater exatamente, o servidor recalcula do zero e nunca confia neste valor).
  // null quando QUALQUER sabor selecionado nao tem preco cadastrado pro tamanho atual --
  // mesmo bug reportado pelo usuario no Menu.tsx, aqui agravado porque o tamanho e'
  // compartilhado entre os 2 sabores (um so' precisar ter o preco nao basta).
  const calculatePrice = (): number | null => {
    const prices = selectedFlavors.map((f) => priceForSize(f, selectedSize.id));
    if (prices.some((p) => p == null)) return null;
    const avgPrice = (prices as number[]).reduce((sum, p) => sum + p, 0) / prices.length;
    return Math.round(avgPrice * 100) / 100;
  };

  const currentPrice = calculatePrice();

  const handleAddFlavor = (pizza: Pizza) => {
    if (canAddFlavor && !selectedFlavors.find(f => f.id === pizza.id)) {
      setSelectedFlavors([...selectedFlavors, pizza]);
      setShowFlavorSelector(false);
    }
  };

  const handleRemoveFlavor = (pizzaId: string) => {
    if (selectedFlavors.length > 1) {
      setSelectedFlavors(selectedFlavors.filter(f => f.id !== pizzaId));
    }
  };

  const handleAddToCart = () => {
    if (currentPrice == null) return;
    onAddToCart({
      size: selectedSize.id,
      flavors: selectedFlavors,
      price: currentPrice,
    });
  };

  if (showFlavorSelector) {
    return (
      <FlavorSelector
        selectedFlavors={selectedFlavors}
        selectedSizeId={selectedSize.id}
        onSelect={handleAddFlavor}
        onBack={() => setShowFlavorSelector(false)}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-32">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-card text-foreground rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-xl text-foreground">Monte sua Pizza</h1>
        </div>
      </div>

      <div className="p-5 max-w-md mx-auto space-y-6 mt-2">
        <div>
          <button
            onClick={() => setShowSizePicker((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-card border border-border text-left"
          >
            <span className="text-sm text-foreground">
              Tamanho: <span className="font-semibold">{selectedSize.name}</span>
            </span>
            <span className="text-sm text-primary font-semibold">Alterar</span>
          </button>
          {showSizePicker && (
            <div className="flex gap-2 mt-2">
              {pizzaSizes.map((size) => {
                // Tamanho so' fica disponivel aqui se TODOS os sabores selecionados
                // tiverem preco pra ele -- diferente do Menu.tsx (1 sabor so'), aqui
                // o tamanho e' compartilhado, entao um sabor sem preco pro tamanho
                // ja' inviabiliza a combinacao inteira.
                const isAvailable = selectedFlavors.every((f) => priceForSize(f, size.id) != null);
                return (
                  <button
                    key={size.id}
                    disabled={!isAvailable}
                    onClick={() => {
                      if (!isAvailable) return;
                      setSelectedSizeId(size.id);
                      setShowSizePicker(false);
                    }}
                    title={!isAvailable ? 'Tamanho não disponível para os sabores selecionados' : undefined}
                    className={`flex-1 py-2 px-1 rounded border text-center transition-colors ${
                      !isAvailable
                        ? 'border-border text-muted-foreground/40 cursor-not-allowed line-through'
                        : selectedSize.id === size.id
                        ? 'border-primary bg-primary/[.13] text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wide">{size.name}</span>
                    <span className="block text-[11px] mt-0.5">{size.slices} pedaços</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">
              Sabores <span className="text-muted-foreground font-normal">({selectedFlavors.length}/2)</span>
            </h2>
            {canAddFlavor && (
              <Button
                size="sm"
                variant="outline"
                className="rounded"
                onClick={() => setShowFlavorSelector(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Mais sabor
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {selectedFlavors.map((flavor, index) => (
              <Card key={flavor.id} className="rounded-xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    <img
                      src={flavor.image}
                      alt={flavor.name}
                      className="w-[76px] h-[76px] object-cover shrink-0 my-auto ml-3 rounded-lg"
                    />
                    <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground leading-tight">{flavor.name}</h3>
                        {selectedFlavors.length > 1 && (
                          <Badge className="shrink-0">{index === 0 ? '1ª Metade' : '2ª Metade'}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{flavor.description}</p>
                      {selectedFlavors.length > 1 && (
                        <button
                          onClick={() => handleRemoveFlavor(flavor.id)}
                          className="text-sm font-semibold text-destructive hover:opacity-80 transition-opacity mt-2 w-fit"
                        >
                          Remover sabor
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo do Pedido</span>
              <span className="text-xs font-semibold text-primary">
                {selectedFlavors.length} sabor{selectedFlavors.length > 1 ? 'es' : ''} • {selectedSize.name}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-serif text-2xl text-primary font-semibold">
                {currentPrice != null ? formatCurrency(currentPrice) : 'Indisponível'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border z-50">
        <Button
          fullWidth
          size="lg"
          disabled={currentPrice == null}
          onClick={handleAddToCart}
          className="h-14 rounded-lg text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingBag className="w-5 h-5" />
          Adicionar ao Carrinho
        </Button>
      </div>
    </div>
  );
}

function FlavorSelector({ selectedFlavors, selectedSizeId, onSelect, onBack }: {
  selectedFlavors: Pizza[];
  selectedSizeId: PizzaSizeId;
  onSelect: (pizza: Pizza) => void;
  onBack: () => void;
}) {
  // Acordeao exclusivo, mesma solucao do Menu.tsx: abrir uma categoria fecha qualquer
  // outra que estivesse aberta.
  const [openCategoryId, setOpenCategoryId] = useState<string>(mockCategories[0]?.id ?? '');

  const toggleCategory = (id: string) => {
    setOpenCategoryId((prev) => (prev === id ? '' : id));
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-card text-foreground rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-xl text-foreground">Escolha o 2º sabor</h1>
        </div>
      </div>

      <div className="p-5 max-w-md mx-auto space-y-3">
        {mockCategories.map((category) => {
          const pizzas = mockPizzas.filter((p) => p.category === category.id);
          if (pizzas.length === 0) return null;
          const isOpen = openCategoryId === category.id;

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
                  {pizzas.map((pizza) => {
                    const isSelected = selectedFlavors.find((f) => f.id === pizza.id);
                    // Sabor sem preco pro tamanho ja' escolhido nao pode virar 2a
                    // metade -- senao a combinacao criada e' invalida por desenho
                    // (o preco medio dos dois sabores ficaria impossivel de calcular).
                    const isPriceAvailable = priceForSize(pizza, selectedSizeId) != null;
                    const isDisabled = Boolean(isSelected) || !isPriceAvailable;
                    return (
                      <div
                        key={pizza.id}
                        onClick={() => { if (isPriceAvailable && !isSelected) onSelect(pizza); }}
                        title={!isPriceAvailable ? 'Sem preço cadastrado para o tamanho selecionado' : undefined}
                        className={`flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-b-0 transition-opacity ${
                          isDisabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:bg-background/40'
                        }`}
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
                          {isSelected && <Badge variant="success" className="mt-1.5">Selecionado</Badge>}
                          {!isSelected && !isPriceAvailable && (
                            <Badge variant="destructive" className="mt-1.5">Tamanho indisponível</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
