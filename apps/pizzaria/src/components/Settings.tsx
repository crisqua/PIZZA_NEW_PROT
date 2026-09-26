import { useState } from 'react';
import { Save, Clock, DollarSign, MapPin, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, formatPhone, formatCnpj } from '@pizza/ui';
import { mockTenant, updateTenantSettings } from '../data/repository';

// Campos que persistem de verdade (existem no schema de "tenants" -- ver
// TenantSettingsInput em data/repository.ts). Descricao/e-mail/cidade/estado abaixo
// continuam mock: nao ha coluna nenhuma pra eles hoje, "Salvar" nao teria o que
// persistir. Horario de funcionamento e tempo de entrega estimado DEIXARAM de ser mock
// na Sprint 27 -- sao so' informativos pro cliente (Menu.tsx), nao fecham a loja
// sozinhos; quem controla se aceita pedido agora e' o StoreOpenToggle (Dashboard/
// Pedidos), nao esses campos.
export function Settings() {
  const [name, setName] = useState(mockTenant.name);
  const [cnpj, setCnpj] = useState(formatCnpj(mockTenant.cnpj ?? ''));
  const [phone, setPhone] = useState(formatPhone(mockTenant.phone));
  const [address, setAddress] = useState(mockTenant.address);
  const [primaryColor, setPrimaryColor] = useState(mockTenant.primaryColor);
  const [logo, setLogo] = useState(mockTenant.logo);
  const [deliveryFee, setDeliveryFee] = useState(String(mockTenant.deliveryFee));
  const [minOrder, setMinOrder] = useState(String(mockTenant.minOrder));
  const [openingTime, setOpeningTime] = useState(mockTenant.openingTime ?? '');
  const [closingTime, setClosingTime] = useState(mockTenant.closingTime ?? '');
  const [openWeekends, setOpenWeekends] = useState(mockTenant.openWeekends ?? true);
  const [estimatedDeliveryMinutes, setEstimatedDeliveryMinutes] = useState(
    mockTenant.estimatedDeliveryMinutes != null ? String(mockTenant.estimatedDeliveryMinutes) : '',
  );
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
        cnpj: cnpj || undefined,
        phone,
        address,
        primaryColor,
        logo,
        deliveryFee: Number(deliveryFee) || 0,
        minOrder: Number(minOrder) || 0,
        openingTime: openingTime || undefined,
        closingTime: closingTime || undefined,
        openWeekends,
        estimatedDeliveryMinutes: estimatedDeliveryMinutes ? Number(estimatedDeliveryMinutes) : undefined,
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
    setCnpj(formatCnpj(mockTenant.cnpj ?? ''));
    setPhone(formatPhone(mockTenant.phone));
    setAddress(mockTenant.address);
    setPrimaryColor(mockTenant.primaryColor);
    setLogo(mockTenant.logo);
    setDeliveryFee(String(mockTenant.deliveryFee));
    setMinOrder(String(mockTenant.minOrder));
    setOpeningTime(mockTenant.openingTime ?? '');
    setClosingTime(mockTenant.closingTime ?? '');
    setOpenWeekends(mockTenant.openWeekends ?? true);
    setEstimatedDeliveryMinutes(mockTenant.estimatedDeliveryMinutes != null ? String(mockTenant.estimatedDeliveryMinutes) : '');
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
          <Input
            label="CNPJ"
            type="text"
            inputMode="numeric"
            maxLength={18}
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            placeholder="00.000.000/0000-00"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Telefone / WhatsApp"
              type="tel"
              inputMode="tel"
              maxLength={16}
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
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
          <p className="text-xs text-muted-foreground">
            Só informativo pro cliente (aparece no cardápio) — não fecha a loja
            sozinho fora desse horário. Quem controla se aceita pedido agora é o
            interruptor "Loja Aberta/Fechada" no Dashboard e em Pedidos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Abertura" type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
            <Input label="Fechamento" type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="weekend"
              checked={openWeekends}
              onChange={(e) => setOpenWeekends(e.target.checked)}
              className="w-4 h-4"
            />
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
            value={estimatedDeliveryMinutes}
            onChange={(e) => setEstimatedDeliveryMinutes(e.target.value)}
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
