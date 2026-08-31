import { useEffect, useState } from 'react';

import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard as RestaurantDashboard } from './components/Dashboard';
import { MenuManagement } from './components/MenuManagement';
import { ProductForm, ProductFormData } from './components/ProductForm';
import { OrdersPanel } from './components/OrdersPanel';
import { OrderDetails } from './components/OrderDetails';
import { Settings } from './components/Settings';
import { Inventory } from './components/Inventory';
import { Financial } from './components/Financial';
import { AddonUpsell } from './components/AddonUpsell';

import {
  mockTenant,
  mockCategories,
  mockPizzas,
  unlockedModules,
  isAuthenticated,
  tryRestoreSession,
  loadDashboardBoot,
  logout,
  createCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  ApiOrder,
} from './data/repository';
import { ADDONS } from './data/addons';
import { Pizza, Category } from '@pizza/types';

type RestaurantView = 'dashboard' | 'menu' | 'product-form' | 'orders' | 'order-details' | 'settings' | 'inventory' | 'financial';

export default function App() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState<RestaurantView>('dashboard');
  const [selectedProduct, setSelectedProduct] = useState<Pizza | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pizzas, setPizzas] = useState<Pizza[]>([]);

  const boot = async () => {
    await tryRestoreSession();
    if (isAuthenticated()) {
      await loadDashboardBoot();
      setCategories(mockCategories);
      setPizzas(mockPizzas);
      setAuthenticated(true);
    }
    setReady(true);
  };

  useEffect(() => {
    boot();
  }, []);

  const handleAuthenticated = async () => {
    await loadDashboardBoot();
    setCategories(mockCategories);
    setPizzas(mockPizzas);
    setAuthenticated(true);
  };

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    setActivePage('dashboard');
  };

  const handleCreateCategory = async (name: string): Promise<Category> => {
    const created = await createCategory(name);
    setCategories((prev) => [...prev, created]);
    return created;
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

  const handleSaveProduct = async (data: ProductFormData) => {
    const input = {
      name: data.name,
      description: data.description,
      price: Number(data.price),
      categoryId: data.category,
      image: data.image,
      ingredients: data.ingredients,
    };
    if (selectedProduct) {
      const updated = await updateProduct(selectedProduct.id, input);
      setPizzas((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await createProduct(input);
      setPizzas((prev) => [...prev, created]);
    }
    setActivePage('menu');
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    setPizzas((prev) => prev.filter((p) => p.id !== id));
  };

  const handleViewOrder = (order: ApiOrder) => {
    setSelectedOrder(order);
    setActivePage('order-details');
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
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        tenantName={mockTenant.name}
        tenantLogo={mockTenant.logo}
        activeAddons={unlockedModules}
        onLogout={handleLogout}
      />
      <div className="flex-1 min-h-screen bg-background relative">
        {activePage === 'dashboard' && <RestaurantDashboard />}
        {activePage === 'menu' && (
          <MenuManagement
            categories={categories}
            pizzas={pizzas}
            onCreateCategory={handleCreateCategory}
            onEditProduct={handleEditProduct}
            onNewProduct={handleNewProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}
        {activePage === 'product-form' && (
          <ProductForm
            product={selectedProduct || undefined}
            categories={categories}
            onCreateCategory={handleCreateCategory}
            onBack={() => setActivePage('menu')}
            onSave={handleSaveProduct}
          />
        )}
        {activePage === 'orders' && <OrdersPanel onViewOrder={handleViewOrder} />}
        {activePage === 'order-details' && selectedOrder && (
          <OrderDetails order={selectedOrder} onBack={() => setActivePage('orders')} />
        )}
        {activePage === 'inventory' && (
          unlockedModules.includes('estoque')
            ? <Inventory />
            : <AddonUpsell addon={ADDONS.find(a => a.id === 'estoque')!} />
        )}
        {activePage === 'financial' && (
          unlockedModules.includes('financeiro')
            ? <Financial />
            : <AddonUpsell addon={ADDONS.find(a => a.id === 'financeiro')!} />
        )}
        {activePage === 'settings' && <Settings />}
      </div>
    </div>
  );
}
