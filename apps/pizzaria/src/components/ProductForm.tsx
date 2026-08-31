import { useState } from 'react';
import { ArrowLeft, Upload, X, Check } from 'lucide-react';
import { Pizza, Category } from '@pizza/types';
import { Card, CardContent, Button, Input, Textarea } from '@pizza/ui';

export interface ProductFormData {
  name: string;
  description: string;
  price: number | string;
  category: string;
  ingredients: string[];
  image: string;
}

interface ProductFormProps {
  product?: Pizza;
  categories: Category[];
  onCreateCategory: (name: string) => Promise<Category>;
  onBack: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
}

export function ProductForm({ product, categories, onCreateCategory, onBack, onSave }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || categories[0]?.id || '',
    ingredients: product?.ingredients || [],
    image: product?.image || '',
  });

  const [newIngredient, setNewIngredient] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
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

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar o produto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmNewCategory = async () => {
    if (newCategoryName.trim()) {
      const created = await onCreateCategory(newCategoryName);
      updateField('category', created.id);
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setIsAddingCategory(true);
                        } else {
                          updateField('category', e.target.value);
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                      <option value="__new__">+ Nova categoria...</option>
                    </select>
                  )}
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-3">
            <Button fullWidth size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Salvando...' : product ? 'Salvar Alterações' : 'Criar Produto'}
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
