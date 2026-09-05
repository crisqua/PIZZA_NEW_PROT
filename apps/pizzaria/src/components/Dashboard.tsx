import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, formatCurrency } from '@pizza/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getOrders, getRevenue, ApiOrder, DailyRevenue } from '../data/repository';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// Antes desta sprint, TODO numero aqui era inventado (sem nenhum import de repository/
// mockData) -- passa a derivar dos mesmos dados ja buscados pras telas de Pedidos/
// Financeiro (sem endpoint novo). Percentuais de tendencia (comparando com periodo
// anterior) foram removidos: nao ha' baseline real pra comparar sem inventar numero de
// novo, melhor mostrar so' o valor real do que uma tendencia fabricada.
export function Dashboard() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [revenue, setRevenue] = useState<DailyRevenue[]>([]);

  useEffect(() => {
    getOrders().then(setOrders).catch(() => undefined);
    getRevenue().then(setRevenue).catch(() => undefined);
  }, []);

  const todayOrders = orders.filter((o) => isToday(o.createdAt));
  const todayCompleted = todayOrders.filter((o) => o.status === 'completed');
  const salesToday = todayCompleted.reduce((sum, o) => sum + o.total, 0);
  const averageTicket = todayCompleted.length > 0 ? salesToday / todayCompleted.length : 0;

  const completedWithDuration = todayCompleted.filter((o) => o.updatedAt !== o.createdAt);
  const averageMinutes = completedWithDuration.length > 0
    ? completedWithDuration.reduce((sum, o) => sum + (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()), 0) /
      completedWithDuration.length / 60_000
    : null;

  const stats = [
    { title: 'Vendas Hoje', value: formatCurrency(salesToday), icon: DollarSign, color: 'text-success' },
    { title: 'Pedidos Hoje', value: String(todayOrders.length), icon: ShoppingBag, color: 'text-primary' },
    { title: 'Ticket Médio', value: formatCurrency(averageTicket), icon: Users, color: 'text-info' },
    { title: 'Tempo Médio', value: averageMinutes !== null ? `${Math.round(averageMinutes)} min` : '—', icon: Clock, color: 'text-warning' },
  ];

  const salesData = revenue.map((d) => ({
    day: WEEKDAY_LABELS[new Date(`${d.date}T12:00:00Z`).getDay()],
    value: d.revenue,
  }));

  const ordersByHour = new Map<number, number>();
  for (const order of todayOrders) {
    const hour = new Date(order.createdAt).getHours();
    ordersByHour.set(hour, (ordersByHour.get(hour) ?? 0) + 1);
  }
  const ordersData = Array.from(ordersByHour.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, count]) => ({ hour: `${hour}h`, orders: count }));

  const revenueByProduct = new Map<string, { sales: number; revenue: number }>();
  for (const order of orders) {
    if (order.status !== 'completed') continue;
    for (const item of order.items) {
      const entry = revenueByProduct.get(item.name) ?? { sales: 0, revenue: 0 };
      entry.sales += item.quantity;
      entry.revenue += item.unitPrice * item.quantity;
      revenueByProduct.set(item.name, entry);
    }
  }
  const topProducts = Array.from(revenueByProduct.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

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
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="day" stroke="#777777" />
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
            <CardTitle>Pedidos por Hora (hoje)</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={ordersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="hour" stroke="#777777" />
                  <YAxis stroke="#777777" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#F5F0E8' }}
                  />
                  <Line type="monotone" dataKey="orders" stroke="#C9A84C" strokeWidth={2} dot={{ fill: '#C9A84C' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-16">Nenhum pedido hoje ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos Mais Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map((item, index) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.sales} vendas</p>
                  </div>
                  <span className="font-bold text-primary shrink-0">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">Nenhum pedido concluído ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
