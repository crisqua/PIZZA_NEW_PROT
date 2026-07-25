import { useState } from 'react';
import { Plus, Search, Edit, Trash2, MoreVertical } from 'lucide-react';
import { mockPizzas, Pizza } from '../../data/mockData';
import { Card, CardContent } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';
import { Badge } from '../Badge';
import { formatCurrency } from '../../lib/utils';

interface MenuManagementProps {
  onEditProduct: (product: Pizza) => void;
  onNewProduct: () => void;
}

export function MenuManagement({ onEditProduct, onNewProduct }: MenuManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'salgada' | 'doce' | 'especial'>('all');

  const filteredPizzas = mockPizzas.filter((pizza) => {
    const matchesSearch = pizza.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || pizza.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
        <div className="flex gap-2">
          {['all', 'salgada', 'doce', 'especial'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat === 'all' ? 'Todas' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPizzas.map((pizza) => (
          <Card key={pizza.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <img src={pizza.image} alt={pizza.name} className="w-full h-full object-cover" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{pizza.name}</h3>
                {pizza.category === 'especial' && (
                  <Badge variant="warning">Especial</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{pizza.description}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-primary font-bold text-lg">{formatCurrency(pizza.price)}</span>
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
                <Button size="sm" variant="ghost" className="shrink-0">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPizzas.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground">
            Tente ajustar os filtros ou criar um novo produto
          </p>
        </div>
      )}
    </div>
  );
}
