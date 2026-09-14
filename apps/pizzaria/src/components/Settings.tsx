import { useState } from 'react';
import { Save, Clock, DollarSign, MapPin, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea } from '@pizza/ui';
import { mockTenant, updateTenantSettings } from '../data/repository';

// Campos que persistem de verdade (existem no schema de "tenants" -- ver
// TenantSettingsInput em data/repository.ts). Descricao/e-mail/cidade/estado/horario de
// funcionamento/tempo de entrega estimado abaixo continuam mock: nao ha coluna nenhuma
// pra eles hoje, "Salvar" nao teria o que persistir (gap conhecido, documentado, nao
// construido agora).
export function Settings() {
  const [name, setName] = useState(mockTenant.name);
  const [phone, setPhone] = useState(mockTenant.phone);
  const [address, setAddress] = useState(mockTenant.address);
  const [primaryColor, setPrimaryColor] = useState(mockTenant.primaryColor);
  const [logo, setLogo] = useState(mockTenant.logo);
  const [deliveryFee, setDeliveryFee] = useState(String(mockTenant.deliveryFee));
  const [minOrder, setMinOrder] = useState(String(mockTenant.minOrder));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    setError('');
    setSaved(false);
    try {
      await updateTenantSettings({
        name,
        phone,
        address,
        primaryColor,
        logo,
        deliveryFee: Number(deliveryFee) || 0,
        minOrder: Number(minOrder) || 0,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setName(mockTenant.name);
    setPhone(mockTenant.phone);
    setAddress(mockTenant.address);
    setPrimaryColor(mockTenant.primaryColor);
    setLogo(mockTenant.logo);
    setDeliveryFee(String(mockTenant.deliveryFee));
    setMinOrder(String(mockTenant.minOrder));
    setError('');
    setSaved(false);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Configurações da Loja</h1>
        <p className="text-muted-foreground">Gerencie as configurações da sua pizzaria</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nome da Pizzaria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite o nome"
          />
          <Textarea
            label="Descrição"
            defaultValue="As melhores pizzas artesanais da cidade"
            placeholder="Descreva sua pizzaria"
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Telefone / WhatsApp"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="E-mail"
              type="email"
              defaultValue="contato@pizzaexpress.com"
              placeholder="email@exemplo.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Rua / Avenida"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Digite o endereço"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Número" defaultValue="789" />
            <div className="col-span-2">
              <Input label="Bairro" defaultValue="Centro" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Cidade" defaultValue="São Paulo" />
            <Input label="Estado" defaultValue="SP" maxLength={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horário de Funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Abertura" type="time" defaultValue="18:00" />
            <Input label="Fechamento" type="time" defaultValue="23:30" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="weekend" defaultChecked className="w-4 h-4" />
            <label htmlFor="weekend" className="text-sm">Aberto aos finais de semana</label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Taxas e Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Taxa de Entrega"
              type="number"
              step="0.01"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="0,00"
            />
            <Input
              label="Pedido Mínimo"
              type="number"
              step="0.01"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <Input
            label="Tempo de Entrega Estimado (minutos)"
            type="number"
            defaultValue="40"
            placeholder="40"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Personalização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Cor Primária</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Logo (Emoji)</label>
              <Input value={logo} onChange={(e) => setLogo(e.target.value)} maxLength={2} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            As cores e logo aparecerão no app do cliente
          </p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-green-600">Configurações salvas com sucesso.</p>}

      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={handleSave} disabled={submitting}>
          <Save className="w-5 h-5" />
          {submitting ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
        <Button variant="outline" size="lg" onClick={handleCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
