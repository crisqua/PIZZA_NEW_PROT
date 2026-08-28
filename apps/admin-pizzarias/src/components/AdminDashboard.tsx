import { TrendingUp, TrendingDown, Store, DollarSign, ShoppingBag, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, formatCurrency } from '@pizza/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const monthlyRevenue = [
  { month: 'Jan', value: 45000 },
  { month: 'Fev', value: 52000 },
  { month: 'Mar', value: 48000 },
  { month: 'Abr', value: 61000 },
  { month: 'Mai', value: 55000 },
  { month: 'Jun', value: 73000 },
];

const tenantsByPlan = [
  { name: 'Basic', value: 45, color: '#457b9d' },
  { name: 'Pro', value: 28, color: '#c9a84c' },
  { name: 'Enterprise', value: 12, color: '#34d399' },
];

export function AdminDashboard() {
  const stats = [
    {
      title: 'Receita Total',
      value: formatCurrency(73000),
      change: '+18%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-success',
    },
    {
      title: 'Pizzarias Ativas',
      value: '85',
      change: '+5',
      trend: 'up' as const,
      icon: Store,
      color: 'text-primary',
    },
    {
      title: 'Total de Pedidos',
      value: '3.254',
      change: '+12%',
      trend: 'up' as const,
      icon: ShoppingBag,
      color: 'text-info',
    },
    {
      title: 'Usuários Ativos',
      value: '12.485',
      change: '+8%',
      trend: 'up' as const,
      icon: Users,
      color: 'text-warning',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard Global</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-accent flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <Badge variant={stat.trend === 'up' ? 'success' : 'warning'}>
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {stat.change}
                  </Badge>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="month" stroke="#777777" />
                <YAxis stroke="#777777" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#F5F0E8' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="value" fill="#C9A84C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pizzarias por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={tenantsByPlan}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tenantsByPlan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#F5F0E8' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {tenantsByPlan.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pizzarias com Melhor Desempenho</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Pizza Express', subdomain: 'pizzaexpress', orders: 342, revenue: 15680 },
              { name: 'Bella Napoli', subdomain: 'bellanapoli', orders: 298, revenue: 13420 },
              { name: 'Pizzaria do Bairro', subdomain: 'pizzariadobairro', orders: 256, revenue: 11240 },
              { name: 'La Fornalha', subdomain: 'lafornalha', orders: 234, revenue: 10890 },
            ].map((item, index) => (
              <div key={item.subdomain} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">{item.subdomain}.pizzas.com</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.orders} pedidos</p>
                  <p className="text-sm text-primary font-bold">{formatCurrency(item.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
