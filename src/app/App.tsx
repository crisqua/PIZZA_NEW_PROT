import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Store, Users, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from './components/Button';
import { Card, CardContent } from './components/Card';
import { Badge } from './components/Badge';

import { Menu } from './components/client/Menu';
import { PizzaBuilder } from './components/client/PizzaBuilder';
import { Cart } from './components/client/Cart';
import { Checkout, CheckoutData } from './components/client/Checkout';
import { OrderConfirmation } from './components/client/OrderConfirmation';

import { Sidebar } from './components/restaurant/Sidebar';
import { Dashboard as RestaurantDashboard } from './components/restaurant/Dashboard';
import { MenuManagement } from './components/restaurant/MenuManagement';
import { ProductForm } from './components/restaurant/ProductForm';
import { OrdersPanel } from './components/restaurant/OrdersPanel';
import { OrderDetails } from './components/restaurant/OrderDetails';
import { Settings } from './components/restaurant/Settings';

import { AdminSidebar } from './components/admin/AdminSidebar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TenantsManagement } from './components/admin/TenantsManagement';
import { TenantForm } from './components/admin/TenantForm';

import { Pizza, Drink, CartItem, Order, mockTenant } from './data/mockData';

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-rose-50 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/10 text-6xl mb-6 shadow-inner shadow-primary/20">🍕</div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 tracking-tight text-foreground">
            DESENVOLVA<span className="text-primary">INC</span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-medium text-muted-foreground mb-6">
            Plataforma SaaS White Label para Pizzarias
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sistema completo com App do Cliente, Painel de Gestão e Painel Administrativo.
            Selecione um módulo para visualizar a demonstração.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link to="/client" className="group">
            <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-primary h-full bg-card/50 backdrop-blur-sm hover:-translate-y-2">
              <CardContent className="p-8 text-center flex flex-col h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">App do Cliente</h3>
                <p className="text-base text-muted-foreground mb-6 flex-grow">
                  Interface mobile-first para pedidos online e montagem de pizzas
                </p>
                <Badge variant="default" className="mb-6 mx-auto w-fit bg-primary/10 text-primary hover:bg-primary/20 border-0">Mobile-First</Badge>
                <div className="mt-auto pt-6 border-t border-border">
                  <ul className="text-sm text-left space-y-3 text-muted-foreground font-medium">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Cardápio interativo</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Montador de pizza (2 sabores)</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Carrinho e checkout</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Integração WhatsApp</li>
                  </ul>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-primary font-bold group-hover:gap-4 transition-all">
                  <span>Visualizar Demo</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/restaurant" className="group">
            <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-success h-full bg-card/50 backdrop-blur-sm hover:-translate-y-2">
              <CardContent className="p-8 text-center flex flex-col h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-success/20 to-success/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Store className="w-10 h-10 text-success" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Painel da Pizzaria</h3>
                <p className="text-base text-muted-foreground mb-6 flex-grow">
                  Gestão completa de pedidos e cardápio para o estabelecimento
                </p>
                <Badge variant="success" className="mb-6 mx-auto w-fit bg-success/10 text-success hover:bg-success/20 border-0">Desktop-First</Badge>
                <div className="mt-auto pt-6 border-t border-border">
                  <ul className="text-sm text-left space-y-3 text-muted-foreground font-medium">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Dashboard com métricas</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Gestão de cardápio</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Pedidos em tempo real</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Configurações da loja</li>
                  </ul>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-success font-bold group-hover:gap-4 transition-all">
                  <span>Visualizar Demo</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin" className="group">
            <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-info h-full bg-card/50 backdrop-blur-sm hover:-translate-y-2">
              <CardContent className="p-8 text-center flex flex-col h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-info/20 to-info/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-10 h-10 text-info" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Painel Admin</h3>
                <p className="text-base text-muted-foreground mb-6 flex-grow">
                  Controle total da plataforma SaaS e gestão de franquias
                </p>
                <Badge variant="info" className="mb-6 mx-auto w-fit bg-info/10 text-info hover:bg-info/20 border-0">Desktop-First</Badge>
                <div className="mt-auto pt-6 border-t border-border">
                  <ul className="text-sm text-left space-y-3 text-muted-foreground font-medium">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-info" /> Dashboard global</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-info" /> Gestão de tenants</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-info" /> Cadastro white label</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-info" /> Configurações base</li>
                  </ul>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-info font-bold group-hover:gap-4 transition-all">
                  <span>Visualizar Demo</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-primary/5 via-accent to-primary/5 border-primary/20 shadow-inner">
            <CardContent className="p-8">
              <h3 className="text-lg font-bold mb-2 text-foreground">Desenvolvido por DESENVOLVAINC</h3>
              <p className="text-muted-foreground font-medium">
                Protótipo de alta fidelidade pronto para demonstração comercial
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ClientApp() {
  type ClientView = 'menu' | 'builder' | 'cart' | 'checkout' | 'confirmation';

  const [view, setView] = useState<ClientView>('menu');
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState('');

  const handleSelectPizza = (pizza: Pizza) => {
    setSelectedPizza(pizza);
    setView('builder');
  };

  const handleAddPizzaToCart = (pizza: { size: string; flavors: Pizza[]; price: number }) => {
    const newItem: CartItem = {
      id: `cart-${Date.now()}`,
      type: 'pizza',
      pizza,
      quantity: 1,
      price: pizza.price,
    };
    setCart([...cart, newItem]);
    setView('menu');
  };

  const handleAddDrink = (drink: Drink) => {
    const existingItem = cart.find(
      item => item.type === 'drink' && item.drink?.id === drink.id
    );

    if (existingItem) {
      setCart(cart.map(item =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        type: 'drink',
        drink,
        quantity: 1,
        price: drink.price,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCheckout = (data: CheckoutData) => {
    const newOrderId = `ORD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    setOrderId(newOrderId);
    setView('confirmation');
  };

  const handleBackToMenu = () => {
    setCart([]);
    setView('menu');
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + mockTenant.deliveryFee;

  return (
    <div className="relative">
      <Link to="/" className="fixed top-4 right-4 z-50">
        <Button size="sm" variant="outline" className="shadow-lg bg-background">
          ← Voltar ao Menu Principal
        </Button>
      </Link>
      {view === 'menu' && (
        <Menu
          onSelectPizza={handleSelectPizza}
          onAddDrink={handleAddDrink}
          cartItemsCount={cart.length}
          onViewCart={() => setView('cart')}
        />
      )}
      {view === 'builder' && selectedPizza && (
        <PizzaBuilder
          initialPizza={selectedPizza}
          onBack={() => setView('menu')}
          onAddToCart={handleAddPizzaToCart}
        />
      )}
      {view === 'cart' && (
        <Cart
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onBack={() => setView('menu')}
          onCheckout={() => setView('checkout')}
        />
      )}
      {view === 'checkout' && (
        <Checkout
          items={cart}
          total={total}
          onBack={() => setView('cart')}
          onConfirm={handleCheckout}
        />
      )}
      {view === 'confirmation' && (
        <OrderConfirmation
          orderId={orderId}
          total={total}
          estimatedTime="40-60 min"
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}

function RestaurantApp() {
  type RestaurantView = 'dashboard' | 'menu' | 'product-form' | 'orders' | 'order-details' | 'settings';

  const [activePage, setActivePage] = useState<RestaurantView>('dashboard');
  const [selectedProduct, setSelectedProduct] = useState<Pizza | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
        onNavigate={setActivePage as any}
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

function AdminApp() {
  type AdminView = 'dashboard' | 'tenants' | 'tenant-form' | 'users' | 'settings';

  const [activePage, setActivePage] = useState<AdminView>('dashboard');
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  const handleEditTenant = (tenant: any) => {
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
        onNavigate={setActivePage as any}
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
            tenant={selectedTenant}
            onBack={() => setActivePage('tenants')}
            onSave={() => setActivePage('tenants')}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/client" element={<ClientApp />} />
        <Route path="/restaurant" element={<RestaurantApp />} />
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
