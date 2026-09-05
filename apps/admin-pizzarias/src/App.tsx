import { useEffect, useState } from 'react';

import { AdminSidebar } from './components/AdminSidebar';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { TenantsManagement } from './components/TenantsManagement';
import { TenantForm } from './components/TenantForm';
import { PlansManagement } from './components/PlansManagement';

import { getPlans, isAuthenticated, tryRestoreSession, logout, createPlan, updatePlan, PlanInput } from './data/repository';
import { Tenant, Plan } from '@pizza/types';

type AdminView = 'dashboard' | 'tenants' | 'tenant-form' | 'plans' | 'users' | 'settings';

export default function App() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState<AdminView>('dashboard');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  const boot = async () => {
    await tryRestoreSession();
    if (isAuthenticated()) {
      // Sessao restaurada pode ser de uma role sem acesso a este painel (cookie de
      // refresh e' compartilhado entre as 3 portas locais). Sem o try/catch, um 403
      // aqui derrubava boot() inteiro e a tela ficava presa em "Carregando..." pra
      // sempre (setReady(true) nunca era alcancado, nunca caia de volta pro login).
      try {
        setPlans(await getPlans());
        setAuthenticated(true);
      } catch {
        await logout();
      }
    }
    setReady(true);
  };

  useEffect(() => {
    boot();
  }, []);

  const handleAuthenticated = async () => {
    setPlans(await getPlans());
    setAuthenticated(true);
  };

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    setActivePage('dashboard');
  };

  const handleSavePlan = async (id: string | undefined, input: PlanInput) => {
    if (id) {
      const updated = await updatePlan(id, input);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await createPlan(input);
      setPlans((prev) => [...prev, created]);
    }
  };

  const handleTogglePlanActive = async (plan: Plan) => {
    const updated = await updatePlan(plan.id, { active: !plan.active });
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleNavigate = (page: string) => setActivePage(page as AdminView);

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setActivePage('tenant-form');
  };

  const handleNewTenant = () => {
    setSelectedTenant(null);
    setActivePage('tenant-form');
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="flex">
      <AdminSidebar activePage={activePage} onNavigate={handleNavigate} onLogout={handleLogout} />
      <div className="flex-1 min-w-0 min-h-screen bg-background relative pt-14 lg:pt-0">
        {activePage === 'dashboard' && <AdminDashboard />}
        {activePage === 'tenants' && (
          <TenantsManagement onEditTenant={handleEditTenant} onNewTenant={handleNewTenant} />
        )}
        {activePage === 'tenant-form' && (
          <TenantForm
            tenant={selectedTenant ?? undefined}
            plans={plans}
            onBack={() => setActivePage('tenants')}
            onSaved={() => setActivePage('tenants')}
          />
        )}
        {activePage === 'plans' && (
          <PlansManagement plans={plans} onSavePlan={handleSavePlan} onToggleActive={handleTogglePlanActive} />
        )}
      </div>
    </div>
  );
}
