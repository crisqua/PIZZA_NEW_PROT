import { useState } from 'react';

import { Sidebar } from './components/Sidebar';
import { Dashboard as RestaurantDashboard } from './components/Dashboard';
import { MenuManagement } from './components/MenuManagement';
import { ProductForm } from './components/ProductForm';
import { OrdersPanel } from './components/OrdersPanel';
import { OrderDetails } from './components/OrderDetails';
import { Settings } from './components/Settings';
import { Inventory } from './components/Inventory';
import { Financial } from './components/Financial';
import { AddonUpsell } from './components/AddonUpsell';

import { mockTenant, mockCategories, mockAddons, mockPlans } from './data/repository';
import { Pizza, Order, Category, AddonId } from '@pizza/types';
import { slugify } from '@pizza/ui';

const planModules = mockPlans.find((p) => p.id === mockTenant.planId)?.modules ?? [];

export default function App() {
  type RestaurantView = 'dashboard' | 'menu' | 'product-form' | 'orders' | 'order-details' | 'settings' | 'inventory' | 'financial';

  const [activePage, setActivePage] = useState<RestaurantView>('dashboard');
  const [selectedProduct, setSelectedProduct] = useState<Pizza | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [activeAddons, setActiveAddons] = useState<AddonId[]>(planModules);

  const handleActivateAddon = (id: AddonId) => {
    setActiveAddons((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleDeactivateAddon = (id: AddonId) => {
    setActiveAddons((prev) => prev.filter((a) => a !== id));
  };

  const handleCreateCategory = (name: string) => {
    const id = slugify(name);
    if (!id || categories.some(c => c.id === id)) return;
    setCategories([...categories, { id, name: name.trim() }]);
  };

  const handleNavigate = (page: string) => setActivePage(page as RestaurantView);

  const handleEditProduct = (product: Pizza) => {
    setSelectedProduct(product);
    setActivePage('product-form');
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setActivePage('product-form');
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setActivePage('order-details');
  };

  return (
    <div className="flex">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        tenantName={mockTenant.name}
        tenantLogo={mockTenant.logo}
        activeAddons={activeAddons}
      />
      <div className="flex-1 min-h-screen bg-background relative">
        {activePage === 'dashboard' && <RestaurantDashboard />}
        {activePage === 'menu' && (
          <MenuManagement
            categories={categories}
            onCreateCategory={handleCreateCategory}
            onEditProduct={handleEditProduct}
            onNewProduct={handleNewProduct}
          />
        )}
        {activePage === 'product-form' && (
          <ProductForm
            product={selectedProduct || undefined}
            categories={categories}
            onCreateCategory={handleCreateCategory}
            onBack={() => setActivePage('menu')}
            onSave={() => setActivePage('menu')}
          />
        )}
        {activePage === 'orders' && (
          <OrdersPanel onViewOrder={handleViewOrder} />
        )}
        {activePage === 'order-details' && selectedOrder && (
          <OrderDetails
            order={selectedOrder}
            onBack={() => setActivePage('orders')}
            onUpdateStatus={() => setActivePage('orders')}
          />
        )}
        {activePage === 'inventory' && (
          activeAddons.includes('estoque')
            ? <Inventory />
            : <AddonUpsell addon={mockAddons.find(a => a.id === 'estoque')!} onActivate={() => handleActivateAddon('estoque')} />
        )}
        {activePage === 'financial' && (
          activeAddons.includes('financeiro')
            ? <Financial />
            : <AddonUpsell addon={mockAddons.find(a => a.id === 'financeiro')!} onActivate={() => handleActivateAddon('financeiro')} />
        )}
        {activePage === 'settings' && (
          <Settings
            activeAddons={activeAddons}
            onActivateAddon={handleActivateAddon}
            onDeactivateAddon={handleDeactivateAddon}
          />
        )}
      </div>
    </div>
  );
}
