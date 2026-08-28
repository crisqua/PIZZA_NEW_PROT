import { useState } from 'react';
import { Search, Minus, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { mockInventory } from '../data/repository';
import { InventoryItem } from '@pizza/types';
import { Card, CardContent, Button, Input, Badge } from '@pizza/ui';

function getStatus(item: InventoryItem): { label: string; variant: 'success' | 'warning' | 'destructive' } {
  if (item.quantity <= item.minQuantity * 0.5) return { label: 'Crítico', variant: 'destructive' };
  if (item.quantity <= item.minQuantity) return { label: 'Baixo', variant: 'warning' };
  return { label: 'OK', variant: 'success' };
}

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>(mockInventory);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: 'kg', quantity: '', minQuantity: '' });

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = items.filter((item) => item.quantity <= item.minQuantity).length;

  const adjustQuantity = (id: string, delta: number) => {
    setItems(items.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(0, Math.round((item.quantity + delta) * 100) / 100) } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleAddItem = () => {
    if (!newItem.name.trim() || !newItem.quantity || !newItem.minQuantity) return;
    setItems([...items, {
      id: `inv-${crypto.randomUUID()}`,
      name: newItem.name.trim(),
      unit: newItem.unit,
      quantity: Number(newItem.quantity),
      minQuantity: Number(newItem.minQuantity),
    }]);
    setNewItem({ name: '', unit: 'kg', quantity: '', minQuantity: '' });
    setIsAdding(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Controle de Estoque</h1>
          <p className="text-muted-foreground">Ingredientes e insumos usados no preparo</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="w-5 h-5" />
          Novo Item
        </Button>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-warning/[.13] border border-warning/[.27] text-sm text-foreground">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          {lowStockCount} {lowStockCount === 1 ? 'item está' : 'itens estão'} abaixo do estoque mínimo
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isAdding && (
        <Card className="rounded-xl">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div className="sm:col-span-2">
              <Input
                label="Nome do item"
                placeholder="Ex: Mussarela"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <Input
              label="Unidade"
              placeholder="kg, L, un..."
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            />
            <Input
              label="Quantidade"
              type="number"
              placeholder="0"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
            />
            <Input
              label="Estoque mínimo"
              type="number"
              placeholder="0"
              value={newItem.minQuantity}
              onChange={(e) => setNewItem({ ...newItem, minQuantity: e.target.value })}
            />
            <div className="sm:col-span-5 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAddItem}>Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          {filteredItems.map((item) => {
            const status = getStatus(item);
            return (
              <div key={item.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">Mínimo: {item.minQuantity} {item.unit}</p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
                <div className="flex items-center gap-1 bg-background p-1 rounded-lg shrink-0">
                  <button
                    onClick={() => adjustQuantity(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:border-primary/50 text-foreground transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-semibold w-16 text-center text-foreground text-sm">
                    {item.quantity} {item.unit}
                  </span>
                  <button
                    onClick={() => adjustQuantity(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded hover:border-primary/50 text-foreground transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-destructive hover:opacity-80 rounded-full transition-opacity shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum item encontrado.
        </div>
      )}
    </div>
  );
}
