import { useState } from 'react';
import { ArrowLeft, Check, Plus, ShoppingBag } from 'lucide-react';
import { Pizza, pizzaSizes } from '../../data/mockData';
import { Card, CardContent } from '../Card';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { formatCurrency } from '../../lib/utils';

interface PizzaBuilderProps {
  initialPizza: Pizza;
  onBack: () => void;
  onAddToCart: (pizza: { size: string; flavors: Pizza[]; price: number }) => void;
}

export function PizzaBuilder({ initialPizza, onBack, onAddToCart }: PizzaBuilderProps) {
  const [selectedSize, setSelectedSize] = useState(pizzaSizes[1]);
  const [selectedFlavors, setSelectedFlavors] = useState<Pizza[]>([initialPizza]);
  const [showFlavorSelector, setShowFlavorSelector] = useState(false);

  const canAddFlavor = selectedFlavors.length < 2;

  const calculatePrice = () => {
    const avgPrice = selectedFlavors.reduce((sum, f) => sum + f.price, 0) / selectedFlavors.length;
    return avgPrice * selectedSize.multiplier;
  };

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
    onAddToCart({
      size: selectedSize.id,
      flavors: selectedFlavors,
      price: calculatePrice(),
    });
  };

  if (showFlavorSelector) {
    return (
      <FlavorSelector
        selectedFlavors={selectedFlavors}
        onSelect={handleAddFlavor}
        onBack={() => setShowFlavorSelector(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-muted/50 hover:bg-muted text-foreground rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-xl tracking-tight">Monte sua Pizza</h1>
        </div>
      </div>

      <div className="p-5 max-w-md mx-auto space-y-8 mt-2">
        <div>
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">1</span>
            Escolha o Tamanho
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {pizzaSizes.map((size) => (
              <button
                key={size.id}
                onClick={() => setSelectedSize(size)}
                className={`p-5 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${
                  selectedSize.id === size.id
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 scale-105'
                    : 'border-border/50 bg-white hover:border-border hover:shadow-sm'
                }`}
              >
                {selectedSize.id === size.id && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full -mr-8 -mt-8" />
                )}
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className={`font-bold text-lg ${selectedSize.id === size.id ? 'text-primary' : 'text-foreground'}`}>{size.name}</span>
                  {selectedSize.id === size.id && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-left font-medium relative z-10">{size.slices} fatias deliciosas</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">2</span>
              Sabores <span className="text-muted-foreground text-sm font-medium">({selectedFlavors.length}/2)</span>
            </h2>
            {canAddFlavor && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-primary/20 text-primary hover:bg-primary/5 font-bold"
                onClick={() => setShowFlavorSelector(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Mais sabor
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {selectedFlavors.map((flavor, index) => (
              <Card key={flavor.id} className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex items-stretch h-full">
                    <div className="w-28 relative overflow-hidden">
                      <img
                        src={flavor.image}
                        alt={flavor.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-foreground text-lg leading-tight">{flavor.name}</h3>
                        {selectedFlavors.length > 1 && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-bold shrink-0">
                            {index === 0 ? '1ª Metade' : '2ª Metade'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 font-medium mb-3">{flavor.description}</p>
                      {selectedFlavors.length > 1 && (
                        <button
                          onClick={() => handleRemoveFlavor(flavor.id)}
                          className="text-sm font-bold text-destructive/80 hover:text-destructive flex items-center gap-1 transition-colors mt-auto w-fit"
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

        <Card className="bg-gradient-to-br from-primary/5 via-accent/50 to-primary/10 border-primary/20 rounded-3xl shadow-inner">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3 border-b border-primary/10 pb-3">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Resumo do Pedido</span>
              <span className="text-sm font-bold text-primary bg-white px-3 py-1 rounded-full shadow-sm">
                {selectedFlavors.length} sabor{selectedFlavors.length > 1 ? 'es' : ''} • {selectedSize.name}
              </span>
            </div>
            <div className="flex items-end justify-between mt-4">
              <span className="font-bold text-lg text-foreground">Total</span>
              <span className="text-3xl font-extrabold text-primary drop-shadow-sm">{formatCurrency(calculatePrice())}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-border/50 z-50">
        <Button 
          fullWidth 
          size="lg" 
          onClick={handleAddToCart}
          className="h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-5 h-5" />
          Adicionar ao Carrinho
        </Button>
      </div>
    </div>
  );
}

function FlavorSelector({ selectedFlavors, onSelect, onBack }: {
  selectedFlavors: Pizza[];
  onSelect: (pizza: Pizza) => void;
  onBack: () => void;
}) {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);

  useState(() => {
    import('../../data/mockData').then(({ mockPizzas }) => {
      setPizzas(mockPizzas);
    });
  });

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-muted/50 hover:bg-muted text-foreground rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-xl tracking-tight">Escolha outro sabor</h1>
        </div>
      </div>

      <div className="p-5 max-w-md mx-auto space-y-4">
        {pizzas.map((pizza) => {
          const isSelected = selectedFlavors.find(f => f.id === pizza.id);
          return (
            <Card
              key={pizza.id}
              className={`cursor-pointer transition-all border-0 shadow-sm rounded-2xl overflow-hidden ${
                isSelected ? 'opacity-50 pointer-events-none grayscale' : 'hover:shadow-md bg-white hover:-translate-y-1'
              }`}
              onClick={() => onSelect(pizza)}
            >
              <div className="flex items-center gap-4 p-4">
                <img
                  src={pizza.image}
                  alt={pizza.name}
                  className="w-24 h-24 rounded-xl object-cover shadow-sm"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{pizza.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 font-medium">{pizza.description}</p>
                  {isSelected && (
                    <Badge variant="success" className="mt-3 font-bold">Selecionado</Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
