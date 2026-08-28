import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { TenantsManagement } from '../components/admin/TenantsManagement';
import { TenantForm } from '../components/admin/TenantForm';

import { Tenant } from '../data/mockData';

export default function AdminApp() {
  type AdminView = 'dashboard' | 'tenants' | 'tenant-form' | 'users' | 'settings';

  const [activePage, setActivePage] = useState<AdminView>('dashboard');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

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
        <Link to="/" className="fixed top-4 right-4 z-50">
          <Button size="sm" variant="outline" className="shadow-lg bg-background">
            ← Voltar ao Menu Principal
          </Button>
        </Link>
        {activePage === 'dashboard' && <AdminDashboard />}
        {activePage === 'tenants' && (
          <TenantsManagement
            onEditTenant={handleEditTenant}
            onNewTenant={handleNewTenant}
          />
        )}
        {activePage === 'tenant-form' && (
          <TenantForm
            tenant={selectedTenant ?? undefined}
            onBack={() => setActivePage('tenants')}
            onSave={() => setActivePage('tenants')}
          />
        )}
      </div>
    </div>
  );
}
