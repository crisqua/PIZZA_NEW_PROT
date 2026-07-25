import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, MoreVertical, ExternalLink } from 'lucide-react';
import { Tenant } from '../../data/mockData';
import { Card, CardContent } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';
import { Badge } from '../Badge';
import { formatCurrency } from '../../lib/utils';

interface TenantsManagementProps {
  onEditTenant: (tenant: Tenant) => void;
  onNewTenant: () => void;
}

const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'Pizza Express',
    subdomain: 'pizzaexpress',
    logo: '🍕',
    primaryColor: '#e84118',
    phone: '(11) 3333-4444',
    address: 'Rua da Pizzaria, 789',
    deliveryFee: 8.00,
    minOrder: 30.00,
  },
  {
    id: '2',
    name: 'Bella Napoli',
    subdomain: 'bellanapoli',
    logo: '🇮🇹',
    primaryColor: '#009432',
    phone: '(11) 2222-3333',
    address: 'Av. Itália, 456',
    deliveryFee: 10.00,
    minOrder: 40.00,
  },
  {
    id: '3',
    name: 'Pizzaria do Bairro',
    subdomain: 'pizzariadobairro',
    logo: '🏘️',
    primaryColor: '#ffa502',
    phone: '(11) 4444-5555',
    address: 'Rua Local, 123',
    deliveryFee: 6.00,
    minOrder: 25.00,
  },
];

export function TenantsManagement({ onEditTenant, onNewTenant }: TenantsManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTenants = mockTenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Gestão de Pizzarias</h1>
          <p className="text-muted-foreground">Gerencie todas as pizzarias da plataforma</p>
        </div>
        <Button onClick={onNewTenant}>
          <Plus className="w-5 h-5" />
          Nova Pizzaria
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar pizzarias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-3xl shrink-0">
                  {tenant.logo}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{tenant.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">
                          {tenant.subdomain}.pizzas.com
                        </span>
                        <button className="text-primary hover:text-primary/80">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Ativo</Badge>
                        <Badge variant="secondary">Plano Pro</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                      <p className="text-sm font-medium">{tenant.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Taxa de Entrega</p>
                      <p className="text-sm font-medium">{formatCurrency(tenant.deliveryFee)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pedido Mínimo</p>
                      <p className="text-sm font-medium">{formatCurrency(tenant.minOrder)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cor Primária</p>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border border-border"
                          style={{ backgroundColor: tenant.primaryColor }}
                        />
                        <span className="text-sm font-medium">{tenant.primaryColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEditTenant(tenant)}>
                      <Edit className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                      Visualizar
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">Nenhuma pizzaria encontrada</h3>
          <p className="text-muted-foreground">
            Tente ajustar a busca ou crie uma nova pizzaria
          </p>
        </div>
      )}
    </div>
  );
}
