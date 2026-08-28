import { useState } from 'react';

import { AdminSidebar } from './components/AdminSidebar';
import { AdminDashboard } from './components/AdminDashboard';
import { TenantsManagement } from './components/TenantsManagement';
import { TenantForm } from './components/TenantForm';
import { PlansManagement } from './components/PlansManagement';

import { mockPlans } from './data/repository';
import { Tenant, Plan } from '@pizza/types';

export default function App() {
  type AdminView = 'dashboard' | 'tenants' | 'tenant-form' | 'plans' | 'users' | 'settings';

  const [activePage, setActivePage] = useState<AdminView>('dashboard');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [plans, setPlans] = useState<Plan[]>(mockPlans);

  const handleSavePlan = (plan: Plan) => {
    setPlans((prev) => prev.some((p) => p.id === plan.id)
      ? prev.map((p) => p.id === plan.id ? plan : p)
      : [...prev, plan]);
  };

  const handleTogglePlanActive = (id: string) => {
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, active: !p.active } : p));
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

  return (
    <div className="flex">
      <AdminSidebar
        activePage={activePage}
        onNavigate={handleNavigate}
      />
      <div className="flex-1 min-h-screen bg-background relative">
        {activePage === 'dashboard' && <AdminDashboard />}
        {activePage === 'tenants' && (
          <TenantsManagement
            plans={plans}
            onEditTenant={handleEditTenant}
            onNewTenant={handleNewTenant}
          />
        )}
        {activePage === 'tenant-form' && (
          <TenantForm
            tenant={selectedTenant ?? undefined}
            plans={plans}
            onBack={() => setActivePage('tenants')}
            onSave={() => setActivePage('tenants')}
          />
        )}
        {activePage === 'plans' && (
          <PlansManagement
            plans={plans}
            onSavePlan={handleSavePlan}
            onToggleActive={handleTogglePlanActive}
          />
        )}
      </div>
    </div>
  );
}
