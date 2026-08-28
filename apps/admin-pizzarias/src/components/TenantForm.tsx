import { useState } from 'react';
import { ArrowLeft, Globe } from 'lucide-react';
import { Tenant, Plan } from '@pizza/types';
import { Card, CardContent, Button, Input, formatCurrency } from '@pizza/ui';

interface TenantFormProps {
  tenant?: Tenant;
  plans: Plan[];
  onBack: () => void;
  onSave: (data: any) => void;
}

export function TenantForm({ tenant, plans, onBack, onSave }: TenantFormProps) {
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    subdomain: tenant?.subdomain || '',
    logo: tenant?.logo || '🍕',
    primaryColor: tenant?.primaryColor || '#e84118',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    deliveryFee: tenant?.deliveryFee || '',
    minOrder: tenant?.minOrder || '',
    planId: tenant?.planId || plans[0]?.id || '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
  });

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <h1 className="text-2xl font-bold">
          {tenant ? 'Editar Pizzaria' : 'Nova Pizzaria'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Informações da Pizzaria</h2>

              <Input
                label="Nome da Pizzaria"
                placeholder="Ex: Pizza Express"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />

              <div>
                <Input
                  label="Subdomínio"
                  placeholder="pizzaexpress"
                  value={formData.subdomain}
                  onChange={(e) => updateField('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                />
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span>URL: {formData.subdomain || 'subdominio'}.pizzas.com</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Telefone / WhatsApp"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
                <Input
                  label="Endereço"
                  placeholder="Rua, número, bairro"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Taxa de Entrega (R$)"
                  type="number"
                  step="0.01"
                  placeholder="8.00"
                  value={formData.deliveryFee}
                  onChange={(e) => updateField('deliveryFee', e.target.value)}
                />
                <Input
                  label="Pedido Mínimo (R$)"
                  type="number"
                  step="0.01"
                  placeholder="30.00"
                  value={formData.minOrder}
                  onChange={(e) => updateField('minOrder', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Dados do Proprietário</h2>

              <Input
                label="Nome Completo"
                placeholder="Nome do proprietário"
                value={formData.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.ownerEmail}
                  onChange={(e) => updateField('ownerEmail', e.target.value)}
                />
                <Input
                  label="Telefone"
                  placeholder="(00) 00000-0000"
                  value={formData.ownerPhone}
                  onChange={(e) => updateField('ownerPhone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Personalização</h2>

              <div>
                <label className="block mb-2 text-sm font-medium">Logo (Emoji)</label>
                <Input
                  placeholder="🍕"
                  value={formData.logo}
                  onChange={(e) => updateField('logo', e.target.value)}
                  maxLength={2}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use um emoji que representa a pizzaria
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Cor Primária</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="w-16 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    placeholder="#e84118"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted">
                <p className="text-sm font-medium mb-3">Preview</p>
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <span className="text-3xl">{formData.logo || '🍕'}</span>
                  <div>
                    <h3 className="font-bold">{formData.name || 'Nome da Pizzaria'}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formData.subdomain || 'subdominio'}.pizzas.com
                    </p>
                  </div>
                </div>
                <div
                  className="mt-3 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  Botão de Exemplo
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Plano</h2>
              <select
                value={formData.planId}
                onChange={(e) => updateField('planId', e.target.value)}
                className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              >
                {plans.filter((p) => p.active).map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {plan.price === null ? 'Negociado' : `${formatCurrency(plan.price)}/mês`}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button fullWidth size="lg" onClick={handleSubmit}>
              {tenant ? 'Salvar Alterações' : 'Criar Pizzaria'}
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
