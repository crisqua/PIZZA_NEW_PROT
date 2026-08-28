import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

import { Sidebar } from '../components/restaurant/Sidebar';
import { Dashboard as RestaurantDashboard } from '../components/restaurant/Dashboard';
import { MenuManagement } from '../components/restaurant/MenuManagement';
import { ProductForm } from '../components/restaurant/ProductForm';
import { OrdersPanel } from '../components/restaurant/OrdersPanel';
import { OrderDetails } from '../components/restaurant/OrderDetails';
import { Settings } from '../components/restaurant/Settings';

import { Pizza, Order, mockTenant } from '../data/mockData';

export default function RestaurantApp() {
  type RestaurantView = 'dashboard' | 'menu' | 'product-form' | 'orders' | 'order-details' | 'settings';

  const [activePage, setActivePage] = useState<RestaurantView>('dashboard');
  const [selectedProduct, setSelectedProduct] = useState<Pizza | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
      />
      <div className="flex-1 min-h-screen bg-background relative">
        <Link to="/" className="fixed top-4 right-4 z-50">
          <Button size="sm" variant="outline" className="shadow-lg bg-background">
            ← Voltar ao Menu Principal
          </Button>
        </Link>
        {activePage === 'dashboard' && <RestaurantDashboard />}
        {activePage === 'menu' && (
          <MenuManagement
            onEditProduct={handleEditProduct}
            onNewProduct={handleNewProduct}
          />
        )}
        {activePage === 'product-form' && (
          <ProductForm
            product={selectedProduct || undefined}
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
        {activePage === 'settings' && <Settings />}
      </div>
    </div>
  );
}
