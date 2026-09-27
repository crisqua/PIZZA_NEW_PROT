import { useEffect, useState } from 'react';
import { Download, ShoppingBag, DollarSign, Users, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, formatCurrency } from '@pizza/ui';
import { getTenants, AdminTenant, getUsers, AdminUser } from '../data/repository';
import { getTenantSales, TenantSales as TenantSalesData } from '../data/repository';

const USERS_PAGE_SIZE = 20;
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos os papéis' },
  { value: 'tenant_owner', label: 'Dono' },
  { value: 'tenant_staff', label: 'Funcionário' },
  { value: 'customer', label: 'Cliente' },
];
const ROLE_LABEL: Record<string, string> = {
  tenant_owner: 'Dono',
  tenant_staff: 'Funcionário',
  customer: 'Cliente',
};
const ROLE_BADGE_VARIANT: Record<string, 'success' | 'info' | 'secondary'> = {
  tenant_owner: 'success',
  tenant_staff: 'info',
  customer: 'secondary',
};

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

  // Usuarios desta pizzaria (sub-secao que substitui a antiga tela "Usuarios",
  // cross-tenant e lenta -- ver docs/pizzaria_sprints.md). So' busca ao clicar
  // ("usersVisible"), nunca junto da consulta de vendas.
  const [usersVisible, setUsersVisible] = useState(false);
  const [usersRole, setUsersRole] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersData, setUsersData] = useState<{ items: AdminUser[]; total: number } | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

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

    // Trocar de pizzaria fecha a secao de usuarios -- nao faz sentido continuar
    // mostrando o dado da pizzaria anterior por um instante.
    setUsersVisible(false);
    setUsersRole('');
    setUsersPage(1);
    setUsersData(null);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !usersVisible) return;
    setUsersLoading(true);
    getUsers({ tenantId: selectedId, role: usersRole || undefined, page: usersPage, pageSize: USERS_PAGE_SIZE })
      .then((res) => setUsersData({ items: res.items, total: res.total }))
      .catch(() => setUsersData(null))
      .finally(() => setUsersLoading(false));
  }, [selectedId, usersVisible, usersRole, usersPage]);

  const usersTotalPages = usersData ? Math.max(1, Math.ceil(usersData.total / USERS_PAGE_SIZE)) : 1;

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

          <div>
            <Button
              variant="outline"
              onClick={() => {
                setUsersVisible((v) => !v);
                setUsersPage(1);
              }}
            >
              <Users className="w-4 h-4" />
              {usersVisible ? 'Ocultar Usuários' : 'Ver Usuários desta Pizzaria'}
            </Button>
          </div>

          {usersVisible && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>Usuários — {sales.tenantName}</CardTitle>
                  <select
                    value={usersRole}
                    onChange={(e) => {
                      setUsersRole(e.target.value);
                      setUsersPage(1);
                    }}
                    className="px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading && <p className="text-sm text-muted-foreground py-6 text-center">Consultando…</p>}

                {!usersLoading && usersData && usersData.items.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nenhum usuário com esse papel nesta pizzaria.
                  </p>
                )}

                {!usersLoading && usersData && usersData.items.length > 0 && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="font-medium py-2 pr-4">Usuário</th>
                            <th className="font-medium py-2 pr-4">Papel</th>
                            <th className="font-medium py-2">Criado em</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersData.items.map((user) => (
                            <tr key={user.id} className="border-t border-border">
                              <td className="py-2 pr-4">
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </td>
                              <td className="py-2 pr-4">
                                <Badge variant={ROLE_BADGE_VARIANT[user.role] ?? 'secondary'}>
                                  {ROLE_LABEL[user.role] ?? user.role}
                                </Badge>
                              </td>
                              <td className="py-2 text-muted-foreground">
                                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
                      <p className="text-sm text-muted-foreground">
                        {usersData.total} {usersData.total === 1 ? 'usuário' : 'usuários'} — página {usersPage} de {usersTotalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={usersPage <= 1} onClick={() => setUsersPage((p) => p - 1)}>
                          <ChevronLeft className="w-4 h-4" />
                          Anterior
                        </Button>
                        <Button size="sm" variant="outline" disabled={usersPage >= usersTotalPages} onClick={() => setUsersPage((p) => p + 1)}>
                          Próxima
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
