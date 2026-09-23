import { useRef, useState } from 'react';
import { ArrowLeft, Upload, X, Check } from 'lucide-react';
import { Category } from '@pizza/types';
import { Card, CardContent, Button, Input, Textarea, centsToDisplay, reaisToCentsDigits } from '@pizza/ui';
import { AdminProduct, ProductType, uploadProductImage } from '../data/repository';

export interface ProductFormData {
  name: string;
  description: string;
  type: ProductType;
  // Pizza: preco explicito por tamanho (revertido de preco-base x multiplicador): o que
  // o dono digita aqui e' exatamente o que o cliente paga por aquele tamanho.
  priceBrotinho: number | string;
  priceOitoPedacos: number | string;
  priceDozePedacos: number | string;
  // Bebida/sobremesa: preco unico + "tamanho" em texto livre (ex. "2L"/"Fatia").
  price: number | string;
  size: string;
  category: string;
  ingredients: string[];
  image: string;
}

// Payload final enviado pro backend (diferente de ProductFormData: os 3 precos de
// pizza ja' resolvidos pra number|null -- null quando o dono deixou o tamanho em
// branco de proposito, nao um valor "0,00" fingindo ser um preco real).
export interface ProductSavePayload {
  name: string;
  description: string;
  type: ProductType;
  priceBrotinho: number | null;
  priceOitoPedacos: number | null;
  priceDozePedacos: number | null;
  price: number | null;
  size: string;
  category: string;
  ingredients: string[];
  image: string;
}

interface ProductFormProps {
  product?: AdminProduct;
  categories: Category[];
  onCreateCategory: (name: string, type: ProductType) => Promise<Category>;
  onBack: () => void;
  onSave: (data: ProductSavePayload) => Promise<void>;
}

const TABS: { id: ProductType; label: string }[] = [
  { id: 'pizza', label: 'Pizza' },
  { id: 'drink', label: 'Bebidas' },
  { id: 'sobremesa', label: 'Sobremesas' },
];

const SIZE_FIELD_LABEL: Record<ProductType, string> = {
  pizza: '',
  drink: 'Tamanho',
  sobremesa: 'Tamanho / Porção',
};

const SIZE_PLACEHOLDER: Record<ProductType, string> = {
  pizza: '',
  drink: 'Ex: 2L',
  sobremesa: 'Ex: Fatia',
};

const SUBMIT_LABEL: Record<ProductType, string> = {
  pizza: 'Criar Pizza',
  drink: 'Criar Bebida',
  sobremesa: 'Criar Sobremesa',
};

export function ProductForm({ product, categories, onCreateCategory, onBack, onSave }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || '',
    description: product?.description || '',
    type: product?.type || 'pizza',
    // Guarda os digitos em centavos (mascara de moeda), nao o valor em reais --
    // convertido de volta pra reais so' na hora de chamar onSave (handleSubmit).
    priceBrotinho: product?.priceBrotinho ? reaisToCentsDigits(product.priceBrotinho) : '',
    priceOitoPedacos: product?.priceOitoPedacos ? reaisToCentsDigits(product.priceOitoPedacos) : '',
    priceDozePedacos: product?.priceDozePedacos ? reaisToCentsDigits(product.priceDozePedacos) : '',
    price: product?.price ? reaisToCentsDigits(product.price) : '',
    size: product?.size || '',
    category: product?.category || categories.find((c) => c.type === (product?.type || 'pizza'))?.id || '',
    ingredients: product?.ingredients || [],
    image: product?.image || '',
  });

  const [newIngredient, setNewIngredient] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sprint 16: upload real de imagem (Supabase Storage) -- fileInputRef porque o <input
  // type="file"> fica escondido, acionado clicando na area tracejada (mesmo padrao
  // "clique pra enviar" ja sugerido no texto que existia antes de ter upload de verdade).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const isPizza = formData.type === 'pizza';

  const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite selecionar o MESMO arquivo de novo depois (ex. apos um erro)
    if (!file) return;

    setUploadError('');
    setUploading(true);
    try {
      const publicUrl = await uploadProductImage(file);
      updateField('image', publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  // Trocar de aba troca o tipo de produto (pizza/bebida/sobremesa) -- os campos de um
  // tipo nao fazem sentido no outro, entao o formulario zera tudo em vez de carregar o
  // que foi digitado antes (pedido do usuario: nao deixar "coca cola" sobrar ao trocar
  // pra sobremesa, por exemplo).
  const handleTabChange = (type: ProductType) => {
    setFormData({
      name: '',
      description: '',
      type,
      priceBrotinho: '',
      priceOitoPedacos: '',
      priceDozePedacos: '',
      price: '',
      size: '',
      category: categories.find((c) => c.type === type)?.id || '',
      ingredients: [],
      image: '',
    });
    setFieldErrors({});
    setError('');
  };

  // Nome, descricao e categoria sao sempre obrigatorios; pizza exige os 3 precos por
  // tamanho, bebida/sobremesa exigem o preco unico (tamanho fica opcional). Imagem e
  // ingredientes ficam opcionais -- mesmo padrao de validate()+fieldErrors ja usado em
  // Checkout.tsx.
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.description.trim()) newErrors.description = 'Descrição é obrigatória';
    if (isPizza) {
      // Cada tamanho e' individualmente opcional (deixar em branco = "nao vendo
      // nesse tamanho") -- so' precisa ter pelo menos 1 preenchido, senao a pizza
      // fica impossivel de pedir em qualquer tamanho (mesma regra que o backend
      // tambem checa, ProductsService.assertPizzaHasAtLeastOnePrice).
      const hasAnyPrice = Boolean(formData.priceBrotinho) || Boolean(formData.priceOitoPedacos) || Boolean(formData.priceDozePedacos);
      if (!hasAnyPrice) newErrors.priceBrotinho = 'Cadastre o preço de pelo menos 1 tamanho';
    } else {
      if (!formData.price) newErrors.price = 'Obrigatório';
    }
    if (!formData.category) newErrors.category = 'Categoria é obrigatória';
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        // Campo em branco vira null (nao "0,00") -- e' o sinal que o backend usa pra
        // saber que o dono nao vende esse tamanho, diferente de um preco de verdade.
        priceBrotinho: formData.priceBrotinho ? Number(formData.priceBrotinho) / 100 : null,
        priceOitoPedacos: formData.priceOitoPedacos ? Number(formData.priceOitoPedacos) / 100 : null,
        priceDozePedacos: formData.priceDozePedacos ? Number(formData.priceDozePedacos) / 100 : null,
        price: formData.price ? Number(formData.price) / 100 : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar o produto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmNewCategory = async () => {
    if (newCategoryName.trim()) {
      const created = await onCreateCategory(newCategoryName, formData.type);
      updateField('category', created.id);
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // So' mostra categorias do mesmo tipo do produto sendo criado/editado -- categoria de
  // pizza nao pode aparecer misturada com categoria de bebida ou sobremesa no mesmo
  // <select> (pedido do usuario).
  const categoriesForType = categories.filter((c) => c.type === formData.type);

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
        <h1 className="text-2xl font-bold mb-4">
          {product ? 'Editar Produto' : 'Novo Produto'}
        </h1>

        {/* Tipo so' pode ser escolhido na criacao -- depois de criado, o tipo de um
            produto nao muda (editar so' mostra os campos do tipo que ele ja e'). */}
        {!product && (
          <div className="flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  formData.type === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Informações Básicas</h2>

              <Input
                label="Nome do Produto"
                placeholder={isPizza ? 'Ex: Margherita' : formData.type === 'drink' ? 'Ex: Coca-Cola 2L' : 'Ex: Pudim de Leite'}
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                error={fieldErrors.name}
              />

              <Textarea
                label="Descrição"
                placeholder="Descreva os detalhes do produto..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                error={fieldErrors.description}
              />

              {isPizza ? (
                <div>
                  <label className="block mb-2 text-sm font-medium">Preços por Tamanho</label>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Deixe um tamanho em branco para não vendê-lo nesta pizza.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Brotinho"
                      placeholder="R$ 0,00"
                      type="text"
                      inputMode="numeric"
                      value={centsToDisplay(String(formData.priceBrotinho))}
                      onChange={(e) => updateField('priceBrotinho', e.target.value.replace(/\D/g, ''))}
                      error={fieldErrors.priceBrotinho}
                    />
                    <Input
                      label="8 Pedaços"
                      placeholder="R$ 0,00"
                      type="text"
                      inputMode="numeric"
                      value={centsToDisplay(String(formData.priceOitoPedacos))}
                      onChange={(e) => updateField('priceOitoPedacos', e.target.value.replace(/\D/g, ''))}
                      error={fieldErrors.priceOitoPedacos}
                    />
                    <Input
                      label="12 Pedaços"
                      placeholder="R$ 0,00"
                      type="text"
                      inputMode="numeric"
                      value={centsToDisplay(String(formData.priceDozePedacos))}
                      onChange={(e) => updateField('priceDozePedacos', e.target.value.replace(/\D/g, ''))}
                      error={fieldErrors.priceDozePedacos}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Preço"
                    placeholder="R$ 0,00"
                    type="text"
                    inputMode="numeric"
                    value={centsToDisplay(String(formData.price))}
                    onChange={(e) => updateField('price', e.target.value.replace(/\D/g, ''))}
                    error={fieldErrors.price}
                  />
                  <Input
                    label={SIZE_FIELD_LABEL[formData.type]}
                    placeholder={SIZE_PLACEHOLDER[formData.type]}
                    value={formData.size}
                    onChange={(e) => updateField('size', e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block mb-2 text-sm font-medium">Categoria</label>
                {isAddingCategory ? (
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
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
                      </div>
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
                      className={`w-full px-4 py-2.5 bg-input-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all ${
                        fieldErrors.category ? 'border-destructive focus:ring-destructive' : 'border-border'
                      }`}
                    >
                      {!formData.category && <option value="">Selecione...</option>}
                      {categoriesForType.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                      <option value="__new__">+ Nova categoria...</option>
                    </select>
                  )}
                {fieldErrors.category && (
                  <p className="mt-1.5 text-sm text-destructive">{fieldErrors.category}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {isPizza && (
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
          )}
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
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 bg-muted/50 hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center px-4">
                      {uploading ? 'Enviando...' : 'Clique para fazer upload de uma imagem'}
                    </p>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">ou cole uma URL</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <Input
                    placeholder="URL da imagem"
                    value={formData.image}
                    onChange={(e) => updateField('image', e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-3">
            <Button fullWidth size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Salvando...' : product ? 'Salvar Alterações' : SUBMIT_LABEL[formData.type]}
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
