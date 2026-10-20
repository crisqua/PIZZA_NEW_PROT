import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Card, CardContent, Button, Input, Badge, Switch, formatPhone } from '@pizza/ui';
import {
  StaffMember,
  StaffInput,
  StaffPermission,
  getStaff,
  createStaff,
  updateStaff,
  getContractTypes,
  getPositions,
  unlockedModules,
} from '../data/repository';

const FIXED_POSITIONS = ['Atendente', 'Pizzaiolo', 'Motoboy'];
const PERMISSION_LABELS: Record<StaffPermission, string> = {
  pedidos: 'Pedidos',
  cardapio: 'Cardápio',
  estoque: 'Estoque',
  financeiro: 'Financeiro',
};

interface FormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  position: string;
  contractType: string;
  admissionDate: string;
  permissions: StaffPermission[];
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  phone: '',
  position: 'Atendente',
  contractType: 'CLT',
  admissionDate: '',
  permissions: [],
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Equipe() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [positions, setPositions] = useState<string[]>(FIXED_POSITIONS);
  const [contractTypes, setContractTypes] = useState<string[]>(['CLT', 'Freelancer']);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Checkbox de Estoque/Financeiro so' aparece se a pizzaria ja tiver o modulo
  // contratado (decisao 9) -- nao faz sentido oferecer permissao pra algo que ela nao
  // comprou (o backend tambem rejeita, isto aqui e' so' a UI refletindo a mesma regra).
  const availablePermissions: StaffPermission[] = ['pedidos', 'cardapio', ...(['estoque', 'financeiro'] as const).filter((m) => unlockedModules.includes(m))];

  useEffect(() => {
    getStaff().then(setStaff).catch(() => undefined);
    getPositions().then(setPositions).catch(() => undefined);
    getContractTypes().then(setContractTypes).catch(() => undefined);
  }, []);

  const openNewForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (member: StaffMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      password: '',
      phone: formatPhone(member.phone),
      position: member.position ?? 'Atendente',
      contractType: member.contractType ?? 'CLT',
      admissionDate: member.admissionDate ? member.admissionDate.slice(0, 10) : '',
      permissions: member.permissions,
    });
    setError(null);
    setIsFormOpen(true);
  };

  // Decisao 9: escolher um dos 3 cargos fixos sugere "pedidos"; cargo customizado nao
  // sugere nada -- o dono decide do zero. So' se aplica num cadastro NOVO (editar um
  // funcionario existente nunca reseta permissoes ja definidas so' por mudar o cargo).
  const handlePositionChange = (position: string) => {
    setForm((prev) => ({
      ...prev,
      position,
      permissions: editingId ? prev.permissions : FIXED_POSITIONS.includes(position) ? ['pedidos'] : [],
    }));
  };

  const togglePermission = (permission: StaffPermission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return;
    if (!editingId && form.password.length < 8) {
      setError('Senha provisória precisa ter pelo menos 8 caracteres.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input: StaffInput = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        position: form.position,
        contractType: form.contractType,
        admissionDate: form.admissionDate || undefined,
        permissions: form.permissions,
      };
      if (editingId) {
        const updated = await updateStaff(editingId, input);
        setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createStaff({ ...input, password: form.password });
        setStaff((prev) => [...prev, created]);
      }
      setIsFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o funcionário.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    const updated = await updateStaff(member.id, { active: !member.active });
    setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold mb-1">Equipe</h1>
          <p className="text-muted-foreground">Funcionários com acesso ao painel de gestão desta pizzaria</p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="w-5 h-5" />
          Novo Funcionário
        </Button>
      </div>

      {isFormOpen && (
        <Card className="rounded-xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">{editingId ? 'Editar funcionário' : 'Novo funcionário'}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                placeholder="Ex: Carlos Mendes"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Telefone"
                type="tel"
                inputMode="tel"
                maxLength={16}
                placeholder="(11) 90000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              />
              <Input
                label="E-mail (login)"
                type="email"
                placeholder="funcionario@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {!editingId && (
                <Input
                  label="Senha provisória"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Cargo / Função</label>
                <select
                  value={form.position}
                  onChange={(e) => handlePositionChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                >
                  {positions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Tipo de contratação</label>
                <select
                  value={form.contractType}
                  onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                >
                  {contractTypes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Data de admissão"
                type="date"
                value={form.admissionDate}
                onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Acesso aos módulos</label>
              <p className="text-sm text-muted-foreground mb-2">
                Estoque e Financeiro só aparecem aqui se esta pizzaria tiver esses módulos contratados.
              </p>
              <div className="flex flex-wrap gap-2">
                {availablePermissions.map((permission) => {
                  const checked = form.permissions.includes(permission);
                  return (
                    <button
                      key={permission}
                      type="button"
                      onClick={() => togglePermission(permission)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        checked
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-input-background border-border text-muted-foreground'
                      }`}
                    >
                      {PERMISSION_LABELS[permission]}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          {staff.map((member) => (
            <div key={member.id} className={`flex flex-wrap items-center gap-4 p-4 ${member.active ? '' : 'opacity-60'}`}>
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {initials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{member.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {member.email} · {member.phone}
                  {member.admissionDate && ` · Admitido em ${new Date(member.admissionDate).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {member.position && <Badge>{member.position}</Badge>}
                {member.contractType && <Badge variant="info">{member.contractType}</Badge>}
                {member.permissions.length > 0 ? (
                  member.permissions.map((p) => (
                    <Badge key={p} variant="success">{PERMISSION_LABELS[p]}</Badge>
                  ))
                ) : (
                  <Badge variant="secondary">Sem acesso a módulo</Badge>
                )}
                <span className={`text-sm font-medium ${member.active ? 'text-success' : 'text-muted-foreground'}`}>
                  {member.active ? 'Ativo' : 'Inativo'}
                </span>
                <Switch checked={member.active} onCheckedChange={() => handleToggleActive(member)} />
                <Button variant="ghost" size="sm" onClick={() => openEditForm(member)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {staff.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum funcionário cadastrado ainda.
        </div>
      )}
    </div>
  );
}
