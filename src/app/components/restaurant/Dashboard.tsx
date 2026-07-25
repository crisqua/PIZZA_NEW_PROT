import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../Card';
import { Badge } from '../Badge';
import { formatCurrency } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const salesData = [
  { day: 'Seg', value: 1200 },
  { day: 'Ter', value: 1850 },
  { day: 'Qua', value: 1600 },
  { day: 'Qui', value: 2100 },
  { day: 'Sex', value: 2800 },
  { day: 'Sáb', value: 3500 },
  { day: 'Dom', value: 3200 },
];

const ordersData = [
  { hour: '18h', orders: 8 },
  { hour: '19h', orders: 15 },
  { hour: '20h', orders: 22 },
  { hour: '21h', orders: 18 },
  { hour: '22h', orders: 12 },
  { hour: '23h', orders: 6 },
];

export function Dashboard() {
  const stats = [
    {
      title: 'Vendas Hoje',
      value: formatCurrency(3450),
      change: '+12%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-success',
    },
    {
      title: 'Pedidos Hoje',
      value: '47',
      change: '+8%',
      trend: 'up' as const,
      icon: ShoppingBag,
      color: 'text-primary',
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(73.40),
      change: '-3%',
      trend: 'down' as const,
      icon: Users,
      color: 'text-info',
    },
    {
      title: 'Tempo Médio',
      value: '42 min',
      change: '+5 min',
      trend: 'down' as const,
      icon: Clock,
      color: 'text-warning',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="day" stroke="#737373" />
                <YAxis stroke="#737373" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="value" fill="#e84118" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="hour" stroke="#737373" />
                <YAxis stroke="#737373" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="orders" stroke="#e84118" strokeWidth={2} dot={{ fill: '#e84118' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos Mais Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Margherita', sales: 32, revenue: 1468.80 },
              { name: 'Calabresa', sales: 28, revenue: 1369.20 },
              { name: 'Portuguesa', sales: 24, revenue: 1269.60 },
              { name: 'Quatro Queijos', sales: 18, revenue: 1024.20 },
            ].map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">{item.sales} vendas</p>
                </div>
                <span className="font-bold text-primary">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
