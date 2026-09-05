import { useState } from 'react';
import { Plus, Check, X, Pencil } from 'lucide-react';
import { PLAN_CODES, CORE_MODULES, mockAddons, PlanInput } from '../data/repository';
import { Plan, PlanCode, AddonId } from '@pizza/types';
import { Card, CardContent, Button, Input, Badge, Switch, formatCurrency, centsToDisplay, reaisToCentsDigits } from '@pizza/ui';

interface PlansManagementProps {
  plans: Plan[];
  onSavePlan: (id: string | undefined, input: PlanInput) => Promise<void>;
  onToggleActive: (plan: Plan) => Promise<void>;
}

const emptyFormFor = (code: PlanCode): Omit<Plan, 'id'> => ({
  code,
  name: '',
  price: 0,
  limitLabel: '',
  modules: [],
  active: true,
});

export function PlansManagement({ plans, onSavePlan, onToggleActive }: PlansManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [form, setForm] = useState<Omit<Plan, 'id'> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availableCodes = PLAN_CODES.filter((code) => !plans.some((p) => p.code === code));
  const orderedPlans = [...plans].sort((a, b) => PLAN_CODES.indexOf(a.code) - PLAN_CODES.indexOf(b.code));

  const startCreate = () => {
    if (availableCodes.length === 0) return;
    setForm(emptyFormFor(availableCodes[0]));
    setPriceInput('');
    setIsCreating(true);
    setEditingId(null);
  };

  const startEdit = (plan: Plan) => {
    setForm({ code: plan.code, name: plan.name, price: plan.price, limitLabel: plan.limitLabel, modules: plan.modules, active: plan.active });
    setPriceInput(plan.price === null ? '' : reaisToCentsDigits(plan.price));
    setEditingId(plan.id);
    setIsCreating(false);
  };

  const cancelForm = () => {
    setForm(null);
    setEditingId(null);
    setIsCreating(false);
  };

  const toggleModule = (moduleId: AddonId) => {
    if (!form) return;
    setForm({
      ...form,
      modules: form.modules.includes(moduleId)
        ? form.modules.filter((m) => m !== moduleId)
        : [...form.modules, moduleId],
    });
  };

  const handleSubmit = async () => {
    if (!form || !form.name.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const price = priceInput === '' ? null : Number(priceInput) / 100;
      const input: PlanInput = { name: form.name.trim(), price, limitLabel: form.limitLabel, modules: form.modules, active: form.active };
      if (!editingId) {
        input.code = form.code;
      }
      await onSavePlan(editingId ?? undefined, input);
      cancelForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o plano.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold mb-1">Planos & Preços</h1>
          <p className="text-muted-foreground">Catálogo de planos que as pizzarias podem assinar na plataforma</p>
        </div>
        <Button onClick={startCreate} disabled={availableCodes.length === 0}>
          <Plus className="w-5 h-5" />
          Novo Plano
        </Button>
      </div>

      {(isCreating || editingId) && form && (
        <Card className="rounded-xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">{editingId ? 'Editar Plano' : 'Novo Plano'}</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-foreground">Código</label>
                {editingId ? (
                  <div className="px-4 py-2.5 bg-muted text-muted-foreground rounded-lg border border-border capitalize">
                    {form.code} <span className="text-xs">(fixo)</span>
                  </div>
                ) : (
                  <select
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value as PlanCode })}
                    className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all capitalize"
                  >
                    {availableCodes.map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                )}
              </div>
              <Input
                label="Nome do Plano"
                placeholder="Ex: Pro"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Preço mensal (vazio = negociado)"
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={centsToDisplay(priceInput)}
                onChange={(e) => setPriceInput(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <Input
              label="Limite / observação"
              placeholder="Ex: Pedidos ilimitados"
              value={form.limitLabel}
              onChange={(e) => setForm({ ...form, limitLabel: e.target.value })}
            />

            <div>
              <label className="block mb-2 text-sm font-medium text-foreground">Módulos inclusos</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {CORE_MODULES.map((name) => (
                  <Badge key={name} variant="secondary">{name} (sempre incluso)</Badge>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mockAddons.map((addon) => (
                  <label
                    key={addon.id}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:border-primary/40"
                  >
                    <input
                      type="checkbox"
                      checked={form.modules.includes(addon.id)}
                      onChange={() => toggleModule(addon.id)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-foreground">{addon.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelForm}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Plano'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orderedPlans.map((plan) => (
          <Card key={plan.id} className={`rounded-xl ${!plan.active ? 'opacity-60' : ''}`}>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{plan.code}</span>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                </div>
                <Switch checked={plan.active} onCheckedChange={() => onToggleActive(plan)} />
              </div>
              <p className="text-2xl font-bold text-primary">
                {plan.price === null ? 'Negociado' : formatCurrency(plan.price)}
                {plan.price !== null && <span className="text-sm text-muted-foreground font-normal">/mês</span>}
              </p>
              <p className="text-sm text-muted-foreground">{plan.limitLabel}</p>
              <div className="space-y-1.5 pt-2 border-t border-border">
                {CORE_MODULES.map((name) => (
                  <div key={name} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-success shrink-0" />
                    {name}
                  </div>
                ))}
                {mockAddons.map((addon) => {
                  const included = plan.modules.includes(addon.id);
                  return (
                    <div key={addon.id} className={`flex items-center gap-2 text-sm ${included ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {included ? <Check className="w-4 h-4 text-success shrink-0" /> : <X className="w-4 h-4 text-muted-foreground shrink-0" />}
                      {addon.name}
                    </div>
                  );
                })}
              </div>
              <Button size="sm" variant="outline" fullWidth onClick={() => startEdit(plan)}>
                <Pencil className="w-4 h-4" />
                Editar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold text-foreground">Módulo</th>
                  {orderedPlans.map((plan) => (
                    <th key={plan.id} className="text-center p-4 font-semibold text-foreground">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {CORE_MODULES.map((name) => (
                  <tr key={name}>
                    <td className="p-4 text-foreground">{name}</td>
                    {orderedPlans.map((plan) => (
                      <td key={plan.id} className="text-center p-4">
                        <Check className="w-4 h-4 text-success inline" />
                      </td>
                    ))}
                  </tr>
                ))}
                {mockAddons.map((addon) => (
                  <tr key={addon.id}>
                    <td className="p-4 text-foreground">{addon.name}</td>
                    {orderedPlans.map((plan) => (
                      <td key={plan.id} className="text-center p-4">
                        {plan.modules.includes(addon.id)
                          ? <Check className="w-4 h-4 text-success inline" />
                          : <X className="w-4 h-4 text-muted-foreground inline" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
