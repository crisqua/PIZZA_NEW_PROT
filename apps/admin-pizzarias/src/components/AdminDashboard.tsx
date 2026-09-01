import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Store, DollarSign, ShoppingBag, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, formatCurrency } from '@pizza/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardStats, DashboardStats } from '../data/repository';

const PLAN_COLORS = ['#c9a84c', '#e84118', '#3b82f6', '#10b981', '#8b5cf6'];

// Design original (Figma Make, ab391be) tinha 4 cards + graficos com dado mockado fixo no
// codigo -- reconstruido aqui com dado real (Sprint 11), mas a leitura de "Receita" mudou:
// nao existe "receita da plataforma" no sentido de vendas, o que existe e' MRR (soma do
// preco do plano de cada assinatura ativa -- o que as pizzarias pagam a DESENVOLVAINC).
// O grafico "por mes" e o ranking usam receita DE PEDIDOS (GMV que passa pela plataforma),
// que e' o que realmente varia mes a mes hoje (assinatura nao tem historico de cobranca).
export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => undefined);
  }, []);

  const ordersDelta =
    stats && stats.ordersLastMonth > 0
      ? Math.round(((stats.ordersThisMonth - stats.ordersLastMonth) / stats.ordersLastMonth) * 100)
      : null;

  const cards = [
    {
      title: 'MRR (assinaturas ativas)',
      value: stats ? formatCurrency(stats.mrr) : '—',
      icon: DollarSign,
      iconClass: 'bg-success/10 text-success',
    },
    {
      title: 'Pizzarias na Plataforma',
      value: stats?.tenantCount ?? '—',
      icon: Store,
      iconClass: 'bg-info/10 text-info',
    },
    {
      title: 'Pedidos Este Mês',
      value: stats?.ordersThisMonth ?? '—',
      delta: ordersDelta,
      icon: ShoppingBag,
      iconClass: 'bg-warning/10 text-warning',
    },
    {
      title: 'Usuários na Plataforma',
      value: stats?.userCount ?? '—',
      icon: Users,
      iconClass: 'bg-primary/10 text-primary',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.iconClass}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {card.delta !== undefined && card.delta !== null && (
                    <Badge variant={card.delta >= 0 ? 'success' : 'warning'}>
                      {card.delta >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {card.delta >= 0 ? '+' : ''}
                      {card.delta}%
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">{card.title}</h3>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Volume de Pedidos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.monthlyOrderVolume ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" stroke="#737373" />
                <YAxis stroke="#737373" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="total" fill="#c9a84c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pizzarias por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.plansDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.plansDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="tenantCount" nameKey="planName">
                      {stats.plansDistribution.map((_, index) => (
                        <Cell key={index} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {stats.plansDistribution.map((item, index) => (
                    <div key={item.planCode} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS[index % PLAN_COLORS.length] }} />
                        <span className="text-sm">{item.planName}</span>
                      </div>
                      <span className="font-semibold">{item.tenantCount}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pizzarias com Melhor Desempenho Este Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {stats && stats.topTenants.length > 0 ? (
            <div className="space-y-4">
              {stats.topTenants.map((item, index) => (
                <div key={item.slug} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.slug}.pizzas.com</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.ordersThisMonth} pedidos</p>
                    <p className="text-sm text-primary font-bold">{formatCurrency(item.revenueThisMonth)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum pedido concluído este mês ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
