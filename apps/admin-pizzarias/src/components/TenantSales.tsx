import { useEffect, useState } from 'react';
import { Download, ShoppingBag, DollarSign, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, formatCurrency } from '@pizza/ui';
import { getTenants, AdminTenant } from '../data/repository';
import { getTenantSales, TenantSales as TenantSalesData } from '../data/repository';

// Sprint "Mudanca de Dashboard" (2026-09-26): substitui o agregado cross-tenant que
// saiu do AdminDashboard.tsx -- o usuario decidiu que "total de pedidos de todas as
// pizzarias somado" nao e' util no dia a dia, prefere consultar uma pizzaria por vez,
// sob demanda. Cada troca de selecao dispara 1 unica consulta (GET /admin/tenants/:id/
// sales) -- tempo constante, nao cresce com o total de pizzarias na plataforma.
//
// Lista de pizzarias do seletor busca no SERVIDOR (mesmo padrao de debounce de
// TenantsManagement.tsx), nao carrega tudo de uma vez: ListTenantsQueryDto.pageSize
// tem @Max(100) -- pedir mais que isso (chegou a ser tentado com 500) da' 400 da API,
// que ficava engolido pelo .catch() e a lista aparecia vazia sem erro nenhum visivel.
const TENANT_LIST_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

export function TenantSales() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [sales, setSales] = useState<TenantSalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedAt, setExportedAt] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilter(filter), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filter]);

  useEffect(() => {
    getTenants({ pageSize: TENANT_LIST_PAGE_SIZE, search: debouncedFilter || undefined })
      .then((res) => setTenants(res.items))
      .catch(() => setTenants([]));
  }, [debouncedFilter]);

  const filteredTenants = tenants;

  useEffect(() => {
    if (!selectedId) {
      setSales(null);
      return;
    }
    setLoading(true);
    setExportedAt(null);
    getTenantSales(selectedId)
      .then(setSales)
      .catch(() => setSales(null))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const ordersDelta =
    sales && sales.ordersLastMonth > 0
      ? Math.round(((sales.ordersThisMonth - sales.ordersLastMonth) / sales.ordersLastMonth) * 100)
      : null;
  const ticketMedio = sales && sales.ordersThisMonth > 0 ? sales.revenueThisMonth / sales.ordersThisMonth : 0;

  const handleExport = () => {
    if (!sales) return;
    setExporting(true);
    const geradoEm = new Date().toLocaleString('pt-BR');
    const rows: (string | number)[][] = [
      ['Pizzaria', sales.tenantName],
      ['Slug', sales.tenantSlug],
      ['Gerado em', geradoEm],
      ['Pedidos Este Mês', sales.ordersThisMonth],
      ['Pedidos Mês Passado', sales.ordersLastMonth],
      ['Variação vs. mês passado (%)', ordersDelta ?? ''],
      ['Receita Este Mês (R$)', sales.revenueThisMonth.toFixed(2).replace('.', ',')],
      ['Usuários Cadastrados', sales.userCount],
      ['Ticket Médio (R$)', ticketMedio.toFixed(2).replace('.', ',')],
      [],
      ['Mês', 'Pedidos Concluídos', 'Receita (R$)'],
      ...sales.monthlyOrderVolume.map((m) => [m.month, m.ordersCompleted, m.revenue.toFixed(2).replace('.', ',')]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas-${sales.tenantSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    setExportedAt(geradoEm);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Vendas por Pizzaria</h1>
        <p className="text-muted-foreground">
          Consulte pedidos, receita e usuários de uma pizzaria específica — sob demanda, sem percorrer a plataforma inteira.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filtrar pizzarias…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[180px] px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        >
          <option value="">Selecione uma pizzaria…</option>
          {filteredTenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Button variant="outline" onClick={handleExport} disabled={!sales || exporting}>
          <Download className="w-4 h-4" />
          {exporting ? 'Gerando…' : 'Exportar CSV'}
        </Button>
      </div>
      {exportedAt && (
        <p className="text-sm text-success">Relatório gerado às {exportedAt}.</p>
      )}

      {!selectedId && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          Selecione uma pizzaria acima para ver pedidos, receita e usuários.
        </div>
      )}

      {selectedId && loading && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          Consultando…
        </div>
      )}

      {selectedId && !loading && sales && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-warning/10 text-warning">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  {ordersDelta !== null && (
                    <Badge variant={ordersDelta >= 0 ? 'success' : 'warning'}>
                      {ordersDelta >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {ordersDelta >= 0 ? '+' : ''}{ordersDelta}%
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Pedidos Este Mês</h3>
                <p className="text-2xl font-bold">{sales.ordersThisMonth}</p>
                <p className="text-xs text-muted-foreground mt-1">{sales.ordersLastMonth} mês passado</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-success/10 text-success mb-4">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Receita Este Mês</h3>
                <p className="text-2xl font-bold">{formatCurrency(sales.revenueThisMonth)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-info/10 text-info mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Usuários Cadastrados</h3>
                <p className="text-2xl font-bold">{sales.userCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10 text-primary mb-4">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-sm text-muted-foreground mb-1">Ticket Médio</h3>
                <p className="text-2xl font-bold">{formatCurrency(ticketMedio)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Volume de Pedidos (últimos 6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sales.monthlyOrderVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" stroke="#737373" />
                  <YAxis stroke="#737373" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="revenue" fill="#c9a84c" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="font-medium py-2 pr-4">Mês</th>
                      <th className="font-medium py-2 pr-4">Pedidos Concluídos</th>
                      <th className="font-medium py-2">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.monthlyOrderVolume.map((m) => (
                      <tr key={m.month} className="border-t border-border">
                        <td className="py-2 pr-4">{m.month}</td>
                        <td className="py-2 pr-4">{m.ordersCompleted}</td>
                        <td className="py-2">{formatCurrency(m.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
