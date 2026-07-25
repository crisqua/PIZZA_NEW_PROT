import { useState } from 'react';
import { ArrowLeft, CreditCard, Banknote, Smartphone, MessageCircle } from 'lucide-react';
import { CartItem, mockTenant } from '../../data/mockData';
import { Card, CardContent } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';
import { Textarea } from '../Textarea';
import { formatCurrency } from '../../lib/utils';

interface CheckoutProps {
  items: CartItem[];
  total: number;
  onBack: () => void;
  onConfirm: (data: CheckoutData) => void;
}

export interface CheckoutData {
  name: string;
  phone: string;
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  paymentMethod: string;
  changeFor?: string;
}

export function Checkout({ items, total, onBack, onConfirm }: CheckoutProps) {
  const [formData, setFormData] = useState<CheckoutData>({
    name: '',
    phone: '',
    address: '',
    addressNumber: '',
    complement: '',
    neighborhood: '',
    paymentMethod: '',
    changeFor: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const paymentMethods = [
    { id: 'dinheiro', name: 'Dinheiro', icon: Banknote },
    { id: 'cartao-debito', name: 'Cartão de Débito', icon: CreditCard },
    { id: 'cartao-credito', name: 'Cartão de Crédito', icon: CreditCard },
    { id: 'pix', name: 'PIX', icon: Smartphone },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
    if (!formData.address.trim()) newErrors.address = 'Endereço é obrigatório';
    if (!formData.addressNumber.trim()) newErrors.addressNumber = 'Número é obrigatório';
    if (!formData.neighborhood.trim()) newErrors.neighborhood = 'Bairro é obrigatório';
    if (!formData.paymentMethod) newErrors.paymentMethod = 'Selecione a forma de pagamento';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onConfirm(formData);
    }
  };

  const updateField = (field: keyof CheckoutData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Finalizar Pedido</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="font-semibold mb-3">Dados Pessoais</h2>
          <div className="space-y-3">
            <Input
              label="Nome completo"
              placeholder="Digite seu nome"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              error={errors.name}
            />
            <Input
              label="Telefone / WhatsApp"
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              error={errors.phone}
            />
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Endereço de Entrega</h2>
          <div className="space-y-3">
            <Input
              label="Rua / Avenida"
              placeholder="Digite o endereço"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              error={errors.address}
            />
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Número"
                placeholder="000"
                value={formData.addressNumber}
                onChange={(e) => updateField('addressNumber', e.target.value)}
                error={errors.addressNumber}
              />
              <div className="col-span-2">
                <Input
                  label="Complemento"
                  placeholder="Apto, Bloco..."
                  value={formData.complement}
                  onChange={(e) => updateField('complement', e.target.value)}
                />
              </div>
            </div>
            <Input
              label="Bairro"
              placeholder="Digite o bairro"
              value={formData.neighborhood}
              onChange={(e) => updateField('neighborhood', e.target.value)}
              error={errors.neighborhood}
            />
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Forma de Pagamento</h2>
          {errors.paymentMethod && (
            <p className="text-sm text-destructive mb-3">{errors.paymentMethod}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => updateField('paymentMethod', method.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.paymentMethod === method.id
                      ? 'border-primary bg-accent'
                      : 'border-border hover:border-border/60'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-2 mx-auto" />
                  <span className="text-sm font-medium block">{method.name}</span>
                </button>
              );
            })}
          </div>

          {formData.paymentMethod === 'dinheiro' && (
            <div className="mt-3">
              <Input
                label="Troco para quanto?"
                placeholder="R$ 0,00"
                value={formData.changeFor}
                onChange={(e) => updateField('changeFor', e.target.value)}
              />
            </div>
          )}
        </div>

        <Card className="bg-accent border-primary/20">
          <CardContent className="p-4">
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
                <span className="font-medium">{formatCurrency(total - mockTenant.deliveryFee)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span className="font-medium">{formatCurrency(mockTenant.deliveryFee)}</span>
              </div>
            </div>
            <div className="h-px bg-border my-3" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total a pagar</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <Button fullWidth size="lg" onClick={handleSubmit}>
          <MessageCircle className="w-5 h-5" />
          Enviar Pedido via WhatsApp
        </Button>
      </div>
    </div>
  );
}
