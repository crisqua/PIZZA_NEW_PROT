import { useRef, useState } from 'react';
import { ArrowLeft, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';
import { buildOrderItems, createOrder, mockTenant, mockCustomer, ApiOrder } from '../data/repository';
import { CartItem } from '@pizza/types';
import { Card, CardContent, Button, Input, formatCurrency } from '@pizza/ui';

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (!ddd) return '';
  if (!rest) return `(${ddd}`;
  const splitAt = digits.length > 10 ? 5 : 4;
  const prefix = rest.slice(0, splitAt);
  const suffix = rest.slice(splitAt);
  return suffix ? `(${ddd}) ${prefix}-${suffix}` : `(${ddd}) ${prefix}`;
}

interface CheckoutProps {
  items: CartItem[];
  total: number;
  onBack: () => void;
  onSuccess: (order: ApiOrder) => void;
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

export function Checkout({ items, total, onBack, onSuccess }: CheckoutProps) {
  const [formData, setFormData] = useState<CheckoutData>({
    name: mockCustomer?.name ?? '',
    phone: mockCustomer?.phone ?? '',
    address: mockCustomer?.address ?? '',
    addressNumber: mockCustomer?.addressNumber ?? '',
    complement: mockCustomer?.complement ?? '',
    neighborhood: mockCustomer?.neighborhood ?? '',
    paymentMethod: '',
    changeFor: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // Gerada UMA vez ao montar a tela e reusada em qualquer reenvio (ex.: falha de rede) --
  // e' isso que garante que um retry do MESMO checkout nunca vira um segundo pedido
  // (arquitetura secao 3.2 item 7 / OrdersService.create no backend).
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const paymentMethods = [
    { id: 'dinheiro', name: 'Dinheiro', icon: Banknote },
    { id: 'cartao', name: 'Cartão', subtitle: 'Débito ou Crédito', icon: CreditCard },
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

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitError('');
    setSubmitting(true);
    try {
      const order = await createOrder(
        {
          items: buildOrderItems(items),
          phone: formData.phone,
          address: formData.address,
          addressNumber: formData.addressNumber,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          paymentMethod: formData.paymentMethod,
          changeFor: formData.changeFor ? Number(formData.changeFor.replace(',', '.')) || undefined : undefined,
        },
        idempotencyKeyRef.current,
      );
      onSuccess(order);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Nao foi possivel enviar o pedido. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof CheckoutData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-32">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-card rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-xl text-foreground">Finalizar Pedido</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        <div>
          <h2 className="font-semibold text-foreground mb-3">Dados Pessoais</h2>
          <div className="space-y-3">
            <Input
              label="Nome completo"
              placeholder="Digite seu nome"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              error={errors.name}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              type="tel"
              inputMode="tel"
              maxLength={16}
              value={formData.phone}
              onChange={(e) => updateField('phone', formatPhone(e.target.value))}
              error={errors.phone}
            />
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-foreground mb-3">Endereço de Entrega</h2>
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
          <h2 className="font-semibold text-foreground mb-3">Forma de Pagamento</h2>
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
                  className={`p-4 rounded-lg border transition-colors ${
                    formData.paymentMethod === method.id
                      ? 'border-primary bg-primary/[.13] text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-2 mx-auto" />
                  <span className="text-sm font-semibold block">{method.name}</span>
                  {method.subtitle && (
                    <span className="text-xs font-normal block mt-0.5 opacity-80">{method.subtitle}</span>
                  )}
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

        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
                <span className="text-foreground">{formatCurrency(total - mockTenant.deliveryFee)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span className="text-foreground">{formatCurrency(mockTenant.deliveryFee)}</span>
              </div>
            </div>
            <div className="h-px bg-border my-3" />
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Total a pagar</span>
              <span className="font-serif text-2xl text-primary font-semibold">{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>

        {submitError && <p className="text-sm text-destructive text-center">{submitError}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4">
        <Button
          fullWidth
          size="lg"
          onClick={handleSubmit}
          disabled={submitting}
          className="h-14 rounded-lg text-base font-semibold"
        >
          <CheckCircle2 className="w-5 h-5" />
          {submitting ? 'Enviando...' : 'Confirmar Pedido'}
        </Button>
      </div>
    </div>
  );
}
