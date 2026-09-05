import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Check, X } from 'lucide-react';
import { Pizza, Category } from '@pizza/types';
import { Card, CardContent, Button, Input, Badge, formatCurrency } from '@pizza/ui';

interface MenuManagementProps {
  categories: Category[];
  pizzas: Pizza[];
  onCreateCategory: (name: string) => void;
  onEditProduct: (product: Pizza) => void;
  onNewProduct: () => void;
  onDeleteProduct: (id: string) => void;
}

export function MenuManagement({ categories, pizzas, onCreateCategory, onEditProduct, onNewProduct, onDeleteProduct }: MenuManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const filteredPizzas = pizzas.filter((pizza) => {
    const matchesSearch = pizza.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || pizza.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleConfirmNewCategory = () => {
    if (newCategoryName.trim()) {
      onCreateCategory(newCategoryName);
      setNewCategoryName('');
    }
    setIsAddingCategory(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Gestão de Cardápio</h1>
          <p className="text-muted-foreground">Gerencie seus produtos</p>
        </div>
        <Button onClick={onNewProduct}>
          <Plus className="w-5 h-5" />
          Novo Produto
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              categoryFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                categoryFilter === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat.name}
            </button>
          ))}

          {isAddingCategory ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                placeholder="Nome da categoria"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmNewCategory();
                  if (e.key === 'Escape') { setIsAddingCategory(false); setNewCategoryName(''); }
                }}
                className="h-9 w-40 py-1.5"
              />
              <Button size="sm" variant="ghost" onClick={handleConfirmNewCategory} className="shrink-0 px-2">
                <Check className="w-4 h-4 text-success" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                className="shrink-0 px-2"
              >
                <X className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Nova Categoria
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPizzas.map((pizza) => (
          <Card key={pizza.id} className="overflow-hidden hover:border-primary/40 transition-colors">
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <img src={pizza.image} alt={pizza.name} className="w-full h-full object-cover" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-lg">{pizza.name}</h3>
                {pizza.featured && (
                  <Badge variant="warning">Especial</Badge>
                )}
              </div>
              <Badge variant="secondary" className="mb-2">
                {categories.find(c => c.id === pizza.category)?.name ?? pizza.category}
              </Badge>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{pizza.description}</p>
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                  <span><span className="text-muted-foreground">Brotinho</span> <span className="text-primary font-semibold">{formatCurrency(pizza.priceBrotinho)}</span></span>
                  <span><span className="text-muted-foreground">8 ped.</span> <span className="text-primary font-semibold">{formatCurrency(pizza.priceOitoPedacos)}</span></span>
                  <span><span className="text-muted-foreground">12 ped.</span> <span className="text-primary font-semibold">{formatCurrency(pizza.priceDozePedacos)}</span></span>
                </div>
              </div>
              <div className="flex items-center justify-end mb-4">
                <Badge variant="success">Ativo</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  fullWidth
                  onClick={() => onEditProduct(pizza)}
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => onDeleteProduct(pizza.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPizzas.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground">
            Tente ajustar os filtros ou criar um novo produto
          </p>
        </div>
      )}
    </div>
  );
}
