import { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getExpenses, createExpense, deleteExpense, getRevenue, DailyRevenue } from '../data/repository';
import { Expense } from '@pizza/types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, formatCurrency, formatDate } from '@pizza/ui';

const EXPENSE_CATEGORIES = ['Insumos', 'Fixas', 'Outras'];

// mockDailyRevenue (7 dias hardcoded, desconectado de mockOrders) vira getRevenue() de
// verdade -- fecha o loop que a Sprint 8 deixou pendente (receita real vem de pedidos
// completed de verdade, agregados no backend em RevenueService).
export function Financial() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    getExpenses().then(setExpenses).catch(() => undefined);
    getRevenue().then(setDailyRevenue).catch(() => undefined);
  }, []);

  const periodRevenue = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = periodRevenue - totalExpenses;

  const expensesByDate = new Map<string, number>();
  for (const e of expenses) {
    expensesByDate.set(e.date, (expensesByDate.get(e.date) ?? 0) + e.amount);
  }
  const chartData = dailyRevenue.map((d) => ({
    day: formatDate(d.date).slice(0, 5),
    Receita: d.revenue,
    Despesas: expensesByDate.get(d.date) ?? 0,
  }));

  const handleAddExpense = async () => {
    if (!newExpense.description.trim() || !newExpense.amount) return;
    const created = await createExpense({
      description: newExpense.description.trim(),
      category: newExpense.category,
      amount: Number(newExpense.amount),
      date: newExpense.date,
    });
    setExpenses((prev) => [created, ...prev]);
    setNewExpense({ description: '', category: EXPENSE_CATEGORIES[0], amount: '', date: new Date().toISOString().slice(0, 10) });
    setIsAdding(false);
  };

  const removeExpense = async (id: string) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Controle Financeiro</h1>
        <p className="text-muted-foreground">Fluxo de caixa dos últimos 7 dias</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-success mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm text-muted-foreground">Receita (7 dias)</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(periodRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <TrendingDown className="w-5 h-5" />
              <span className="text-sm text-muted-foreground">Despesas lançadas</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Wallet className="w-5 h-5" />
              <span className="text-sm text-muted-foreground">Saldo</span>
            </div>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Despesas</CardTitle>
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4" />
            Nova Despesa
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && (
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
                type="number"
                step="0.01"
                placeholder="0,00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              />
              <Input
                label="Data"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              />
              <div className="sm:col-span-5 flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleAddExpense}>Adicionar</Button>
              </div>
            </div>
          )}

          <div className="divide-y divide-border">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{expense.description}</h4>
                  <p className="text-sm text-muted-foreground">{expense.category} • {formatDate(expense.date)}</p>
                </div>
                <span className="font-semibold text-destructive shrink-0">-{formatCurrency(expense.amount)}</span>
                <button
                  onClick={() => removeExpense(expense.id)}
                  className="p-2 text-muted-foreground hover:text-destructive rounded-full transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {expenses.length === 0 && (
            <p className="text-center text-muted-foreground py-6">Nenhuma despesa lançada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
