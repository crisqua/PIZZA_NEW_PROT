import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Wallet, Users, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getExpenses, createExpense, updateExpense, deleteExpense, getRevenue, getOrders, DailyRevenue, ApiOrder } from '../data/repository';
import { Expense } from '@pizza/types';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, formatCurrency, formatDate, centsToDisplay, reaisToCentsDigits } from '@pizza/ui';

const EXPENSE_CATEGORIES = ['Insumos', 'Fixas', 'Outras'];
const CATEGORY_COLORS: Record<string, string> = { Insumos: 'bg-primary', Fixas: 'bg-info', Outras: 'bg-warning' };
// Mesmos 2 valores aceitos hoje no Checkout do cliente (Checkout.tsx:45) -- nao existe
// Pix ainda, so' dinheiro/cartao.
const PAYMENT_LABELS: Record<string, string> = { dinheiro: 'Dinheiro', cartao: 'Cartão' };
const PAYMENT_COLORS: Record<string, string> = { dinheiro: 'bg-primary', cartao: 'bg-info' };

const PERIOD_OPTIONS = [7, 30, 90] as const;
type PeriodDays = (typeof PERIOD_OPTIONS)[number];

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Protótipo aprovado em Claude Design (2026-09-14) -- corrige a inconsistência do
// desenho anterior (Despesas somava TODO o histórico enquanto Receita era só 7 dias
// fixos, o Saldo comparava períodos diferentes) e agrega breakdowns que já existiam
// como dado (paymentMethod dos pedidos, categoria das despesas) mas nunca eram exibidos.
export function Financial() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [prevRevenueTotal, setPrevRevenueTotal] = useState<number | null>(null);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    date: toLocalDateStr(new Date()),
  });

  const today = new Date();
  const from = addDays(today, -(periodDays - 1));
  const fromStr = toLocalDateStr(from);
  const toStr = toLocalDateStr(today);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(periodDays - 1));
  const prevFromStr = toLocalDateStr(prevFrom);
  const prevToStr = toLocalDateStr(prevTo);

  useEffect(() => {
    getExpenses().then(setExpenses).catch(() => undefined);
    getOrders().then(setOrders).catch(() => undefined);
    getRevenue(fromStr, toStr).then(setDailyRevenue).catch(() => undefined);
    getRevenue(prevFromStr, prevToStr)
      .then((prev) => setPrevRevenueTotal(prev.reduce((sum, d) => sum + d.revenue, 0)))
      .catch(() => setPrevRevenueTotal(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays]);

  const periodExpenses = expenses.filter((e) => e.date >= fromStr && e.date <= toStr);
  const prevPeriodExpenses = expenses.filter((e) => e.date >= prevFromStr && e.date <= prevToStr);
  const periodOrders = orders.filter((o) => {
    const d = toLocalDateStr(new Date(o.createdAt));
    return d >= fromStr && d <= toStr;
  });
  const periodCompleted = periodOrders.filter((o) => o.status === 'completed');

  const periodRevenue = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = periodRevenue - totalExpenses;
  const prevTotalExpenses = prevPeriodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const averageTicket = periodCompleted.length > 0 ? periodCompleted.reduce((sum, o) => sum + o.total, 0) / periodCompleted.length : 0;

  function pctChange(current: number, previous: number | null): number | null {
    if (previous === null || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  }
  const revenueDelta = pctChange(periodRevenue, prevRevenueTotal);
  const expensesDelta = pctChange(totalExpenses, prevTotalExpenses);
  const prevBalance = prevRevenueTotal !== null ? prevRevenueTotal - prevTotalExpenses : null;
  const balanceDelta = pctChange(balance, prevBalance);

  const expensesByDate = new Map<string, number>();
  for (const e of periodExpenses) {
    expensesByDate.set(e.date, (expensesByDate.get(e.date) ?? 0) + e.amount);
  }
  const chartData = dailyRevenue.map((d) => ({
    day: formatDate(d.date).slice(0, 5),
    Receita: d.revenue,
    Despesas: expensesByDate.get(d.date) ?? 0,
  }));

  const categoryTotals = EXPENSE_CATEGORIES.map((category) => ({
    category,
    total: periodExpenses.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0),
  }));
  const categoryGrandTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0);

  const paymentTotalsMap = new Map<string, number>();
  for (const o of periodCompleted) {
    paymentTotalsMap.set(o.paymentMethod, (paymentTotalsMap.get(o.paymentMethod) ?? 0) + o.total);
  }
  const paymentTotals = Array.from(paymentTotalsMap.entries()).map(([method, total]) => ({
    method,
    label: PAYMENT_LABELS[method] ?? method,
    total,
  }));
  const paymentGrandTotal = paymentTotals.reduce((sum, p) => sum + p.total, 0);

  const visibleExpenses = categoryFilter === 'all' ? periodExpenses : periodExpenses.filter((e) => e.category === categoryFilter);

  const resetForm = () => {
    setNewExpense({ description: '', category: EXPENSE_CATEGORIES[0], amount: '', date: toLocalDateStr(new Date()) });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSaveExpense = async () => {
    if (!newExpense.description.trim() || !newExpense.amount) return;
    const payload = {
      description: newExpense.description.trim(),
      category: newExpense.category,
      amount: Number(newExpense.amount) / 100,
      date: newExpense.date,
    };
    if (editingId) {
      const updated = await updateExpense(editingId, payload);
      setExpenses((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
    } else {
      const created = await createExpense(payload);
      setExpenses((prev) => [created, ...prev]);
    }
    resetForm();
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setIsAdding(false);
    setNewExpense({
      description: expense.description,
      category: expense.category,
      amount: reaisToCentsDigits(expense.amount),
      date: expense.date,
    });
  };

  const removeExpense = async (id: string) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (editingId === id) resetForm();
  };

  const handleExport = () => {
    const rows = [
      ['Data', 'Descrição', 'Categoria', 'Valor'],
      ...periodExpenses.map((e) => [e.date, e.description, e.category, e.amount.toFixed(2).replace('.', ',')]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro-${fromStr}-a-${toStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Controle Financeiro</h1>
          <p className="text-muted-foreground">Receitas, despesas e saldo do período selecionado</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-muted p-1 rounded-xl">
            {PERIOD_OPTIONS.map((days) => (
              <button
                key={days}
                onClick={() => setPeriodDays(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  periodDays === days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-success">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm text-muted-foreground">Receita ({periodDays} dias)</span>
              </div>
              {revenueDelta !== null && (
                <Badge variant={revenueDelta >= 0 ? 'success' : 'destructive'}>{revenueDelta >= 0 ? '+' : ''}{Math.round(revenueDelta)}%</Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{formatCurrency(periodRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-destructive">
                <TrendingDown className="w-5 h-5" />
                <span className="text-sm text-muted-foreground">Despesas ({periodDays} dias)</span>
              </div>
              {expensesDelta !== null && (
                <Badge variant={expensesDelta <= 0 ? 'success' : 'destructive'}>{expensesDelta >= 0 ? '+' : ''}{Math.round(expensesDelta)}%</Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-primary">
                <Wallet className="w-5 h-5" />
                <span className="text-sm text-muted-foreground">Saldo ({periodDays} dias)</span>
              </div>
              {balanceDelta !== null && (
                <Badge variant={balanceDelta >= 0 ? 'success' : 'destructive'}>{balanceDelta >= 0 ? '+' : ''}{Math.round(balanceDelta)}%</Badge>
              )}
            </div>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-info mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm text-muted-foreground">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(averageTicket)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receita x Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="day" stroke="#777777" fontSize={12} />
                <YAxis stroke="#777777" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#F5F0E8' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receita" fill="#C9A84C" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Despesas" fill="#B5544A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {categoryGrandTotal === 0 ? (
              <p className="text-center text-muted-foreground py-6">Nenhuma despesa no período.</p>
            ) : (
              categoryTotals.map(({ category, total }) => {
                const pct = Math.round((total / categoryGrandTotal) * 100);
                return (
                  <div key={category}>
                    <div className="flex justify-between mb-1.5 text-sm">
                      <span className="font-medium">{category}</span>
                      <span className="text-muted-foreground">{formatCurrency(total)} <span className="text-foreground font-semibold">· {pct}%</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <div className={`h-full rounded-full ${CATEGORY_COLORS[category] ?? 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}

            <h3 className="text-base font-semibold pt-2">Formas de Pagamento</h3>
            {paymentGrandTotal === 0 ? (
              <p className="text-center text-muted-foreground py-6">Nenhum pedido concluído no período.</p>
            ) : (
              paymentTotals.map(({ method, label, total }) => {
                const pct = Math.round((total / paymentGrandTotal) * 100);
                return (
                  <div key={method}>
                    <div className="flex justify-between mb-1.5 text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{formatCurrency(total)} <span className="text-foreground font-semibold">· {pct}%</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <div className={`h-full rounded-full ${PAYMENT_COLORS[method] ?? 'bg-muted-foreground'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle>Despesas</CardTitle>
          <Button size="sm" onClick={() => { setIsAdding(true); setEditingId(null); }}>
            <Plus className="w-4 h-4" />
            Nova Despesa
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${categoryFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Todas
            </button>
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${categoryFilter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {(isAdding || editingId) && (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end p-4 rounded-lg bg-background border border-border">
              <div className="sm:col-span-2">
                <Input
                  label="Descrição"
                  placeholder="Ex: Compra de insumos"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-foreground">Categoria</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                >
                  {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <Input
                label="Valor"
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={centsToDisplay(newExpense.amount)}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value.replace(/\D/g, '') })}
              />
              <Input
                label="Data"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              />
              <div className="sm:col-span-5 flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={resetForm}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveExpense}>{editingId ? 'Salvar' : 'Adicionar'}</Button>
              </div>
            </div>
          )}

          <div className="divide-y divide-border">
            {visibleExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{expense.description}</h4>
                  <p className="text-sm text-muted-foreground">{expense.category} • {formatDate(expense.date)}</p>
                </div>
                <span className="font-semibold text-destructive shrink-0">-{formatCurrency(expense.amount)}</span>
                <button
                  onClick={() => startEdit(expense)}
                  className="p-2 text-muted-foreground hover:text-primary rounded-full transition-colors shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeExpense(expense.id)}
                  className="p-2 text-muted-foreground hover:text-destructive rounded-full transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {visibleExpenses.length === 0 && (
            <p className="text-center text-muted-foreground py-6">Nenhuma despesa lançada neste período.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
