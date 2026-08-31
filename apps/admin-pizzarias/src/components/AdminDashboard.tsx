import { useEffect, useState } from 'react';
import { Store, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@pizza/ui';
import { getDashboardStats, DashboardStats } from '../data/repository';

// Escopo desta sprint e' deliberadamente pequeno (docs/MVP_SPRINTS.md): "contagem de
// tenants, pedidos do mes -- sem metricas financeiras de plataforma" (billing da propria
// DESENVOLVAINC fica fora do MVP). O grafico de receita da plataforma/pizza de planos/
// ranking de tenants por receita que existia no mock foi removido, nao conectado --
// nao pedido, e "receita da plataforma" nem e' um conceito que este projeto modela hoje
// (o que existe e' receita DO TENANT, modulo financial das Sprints 7/8).
export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => undefined);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-primary">
                <Store className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Pizzarias na Plataforma</h3>
            <p className="text-2xl font-bold">{stats?.tenantCount ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-info">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Pedidos Este Mês (todas as pizzarias)</h3>
            <p className="text-2xl font-bold">{stats?.ordersThisMonth ?? '—'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
