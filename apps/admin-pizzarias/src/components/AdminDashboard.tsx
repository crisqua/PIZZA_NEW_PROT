import { useEffect, useState } from 'react';
import { Store, DollarSign, ArrowRight } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, formatCurrency } from '@pizza/ui';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboardStats, DashboardStats } from '../data/repository';

const PLAN_COLORS = ['#c9a84c', '#e84118', '#3b82f6', '#10b981', '#8b5cf6'];

// Design original (Figma Make, ab391be) tinha 4 cards + graficos com dado mockado fixo no
// codigo -- reconstruido com dado real na Sprint 11. Sprint "Mudanca de Dashboard"
// (2026-09-26) removeu "Pedidos Este Mes"/"Usuarios na Plataforma"/o grafico de volume
// mensal/o ranking de melhor desempenho: essas 4 coisas exigiam abrir 1 transacao POR
// tenant (RLS de orders/users), ~47s de carga fria com 135 tenants no homolog, e o
// usuario decidiu que o agregado cross-tenant nao e' util no dia a dia -- ele prefere
// consultar pedidos/receita/usuarios de UMA pizzaria por vez (ver TenantSales.tsx). O
// que sobra aqui (MRR/distribuicao por plano/contagem aberta-fechada) ja era O(1) desde
// as Sprints 22/27, entao continua tao rapido quanto sempre foi.
interface AdminDashboardProps {
  onNavigateToSales?: () => void;
}

export function AdminDashboard({ onNavigateToSales }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => undefined);
  }, []);

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
      // Sprint 27 introduziu o toggle manual de loja aberta/fechada -- subtitulo
      // reaproveita o mesmo dado ja' carregado no card acima, sem consulta nova.
      subtitle: stats ? `🟢 ${stats.openTenantCount} abertas · 🔴 ${stats.closedTenantCount} fechadas` : undefined,
      icon: Store,
      iconClass: 'bg-info/10 text-info',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.iconClass}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">{card.title}</h3>
                <p className="text-2xl font-bold">{card.value}</p>
                {'subtitle' in card && card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Pedidos, receita e usuários</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <p className="text-sm text-muted-foreground flex-1 mb-4">
              Não aparecem mais agregados aqui. Consulte pedidos, faturamento e usuários de uma
              pizzaria específica — ou exporte um relatório em CSV — na tela dedicada.
            </p>
            <Button onClick={onNavigateToSales} className="w-fit">
              Ir para Vendas por Pizzaria
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
