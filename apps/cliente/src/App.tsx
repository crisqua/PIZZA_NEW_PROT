import { useEffect, useState, CSSProperties } from 'react';

import { Menu } from './components/Menu';
import { PizzaBuilder } from './components/PizzaBuilder';
import { Cart } from './components/Cart';
import { Auth } from './components/Auth';
import { Checkout } from './components/Checkout';
import { OrderConfirmation } from './components/OrderConfirmation';

import { mockTenant, pizzaSizes, isAuthenticated, loadCatalog, tryRestoreSession, ApiOrder } from './data/repository';
import { Pizza, Drink, CartItem, PizzaSizeId } from '@pizza/types';

export default function App() {
  type ClientView = 'menu' | 'builder' | 'cart' | 'auth' | 'checkout' | 'confirmation';

  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ClientView>('menu');
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [selectedSize, setSelectedSize] = useState<PizzaSizeId>('oito-pedacos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState('');
  const [lastOrder, setLastOrder] = useState<ApiOrder | null>(null);

  // Boot: tenta restaurar a sessao via cookie de refresh (Sprint 2) e carrega o cardapio
  // real ANTES de renderizar qualquer coisa que dependa deles -- Menu.tsx/PizzaBuilder.tsx
  // leem mockTenant/mockPizzas/mockDrinks como bindings de modulo sincronos (repository.ts),
  // entao precisam ja estar populados no momento em que esses componentes montam.
  useEffect(() => {
    (async () => {
      await tryRestoreSession();
      await loadCatalog();
      setReady(true);
    })();
  }, []);

  const handleStartHalfHalf = (pizza: Pizza, size: PizzaSizeId) => {
    setSelectedPizza(pizza);
    setSelectedSize(size);
    setView('builder');
  };

  const handleAddSingleFlavor = (pizza: Pizza, size: PizzaSizeId) => {
    const sizeInfo = pizzaSizes.find(s => s.id === size)!;
    const price = pizza.price * sizeInfo.multiplier;
    const newItem: CartItem = {
      id: `cart-${crypto.randomUUID()}`,
      type: 'pizza',
      pizza: { size, flavors: [pizza] },
      quantity: 1,
      price,
    };
    setCart([...cart, newItem]);
  };

  const handleAddPizzaToCart = (pizza: { size: PizzaSizeId; flavors: Pizza[]; price: number }) => {
    const newItem: CartItem = {
      id: `cart-${crypto.randomUUID()}`,
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
        id: `cart-${crypto.randomUUID()}`,
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

  // Navegar/montar carrinho continua livre sem login; so' o checkout exige sessao
  // (MVP.md item 3, DoD da Sprint 7).
  const handleGoToCheckout = () => {
    setView(isAuthenticated() ? 'checkout' : 'auth');
  };

  const handleOrderSuccess = (order: ApiOrder) => {
    setLastOrder(order);
    setOrderId(order.id);
    setCart([]);
    setView('confirmation');
  };

  const handleBackToMenu = () => {
    setCart([]);
    setView('menu');
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + mockTenant.deliveryFee;

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando cardápio...</p>
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{ '--color-primary': mockTenant.primaryColor, '--color-accent': mockTenant.primaryColor } as CSSProperties}
    >
      {view === 'menu' && (
        <Menu
          onAddSingleFlavor={handleAddSingleFlavor}
          onStartHalfHalf={handleStartHalfHalf}
          onAddDrink={handleAddDrink}
          cartItemsCount={cart.length}
          onViewCart={() => setView('cart')}
        />
      )}
      {view === 'builder' && selectedPizza && (
        <PizzaBuilder
          initialPizza={selectedPizza}
          initialSize={selectedSize}
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
          onCheckout={handleGoToCheckout}
        />
      )}
      {view === 'auth' && <Auth onBack={() => setView('cart')} onAuthenticated={() => setView('checkout')} />}
      {view === 'checkout' && (
        <Checkout items={cart} total={total} onBack={() => setView('cart')} onSuccess={handleOrderSuccess} />
      )}
      {view === 'confirmation' && (
        <OrderConfirmation
          orderId={orderId}
          total={lastOrder?.total ?? total}
          estimatedTime="40-60 min"
          customerName={lastOrder?.customerName}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}
