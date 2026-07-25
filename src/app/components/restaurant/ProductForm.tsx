import { useState } from 'react';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { Pizza } from '../../data/mockData';
import { Card, CardContent } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';
import { Textarea } from '../Textarea';

interface ProductFormProps {
  product?: Pizza;
  onBack: () => void;
  onSave: (data: any) => void;
}

export function ProductForm({ product, onBack, onSave }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || 'salgada',
    ingredients: product?.ingredients || [],
    image: product?.image || '',
  });

  const [newIngredient, setNewIngredient] = useState('');

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      updateField('ingredients', [...formData.ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    updateField('ingredients', formData.ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <h1 className="text-2xl font-bold">
          {product ? 'Editar Produto' : 'Novo Produto'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Informações Básicas</h2>

              <Input
                label="Nome do Produto"
                placeholder="Ex: Margherita"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />

              <Textarea
                label="Descrição"
                placeholder="Descreva os detalhes do produto..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Preço Base (Média)"
                  placeholder="0,00"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => updateField('price', e.target.value)}
                />

                <div>
                  <label className="block mb-2 text-sm font-medium">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="salgada">Salgada</option>
                    <option value="doce">Doce</option>
                    <option value="especial">Especial</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Ingredientes</h2>

              <div className="flex gap-2">
                <Input
                  placeholder="Digite um ingrediente..."
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                />
                <Button onClick={addIngredient}>Adicionar</Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.ingredients.map((ingredient, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-accent-foreground rounded-full text-sm"
                  >
                    {ingredient}
                    <button
                      onClick={() => removeIngredient(index)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Imagem</h2>

              {formData.image ? (
                <div className="space-y-3">
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    variant="outline"
                    fullWidth
                    size="sm"
                    onClick={() => updateField('image', '')}
                  >
                    Remover Imagem
                  </Button>
                </div>
              ) : (
                <div className="aspect-square w-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 bg-muted/50">
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Clique para fazer upload ou cole a URL da imagem
                  </p>
                  <Input
                    placeholder="URL da imagem"
                    value={formData.image}
                    onChange={(e) => updateField('image', e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button fullWidth size="lg" onClick={handleSubmit}>
              {product ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
            <Button fullWidth variant="outline" onClick={onBack}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
