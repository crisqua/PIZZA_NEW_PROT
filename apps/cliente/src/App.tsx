import { useState, CSSProperties } from 'react';

import { Menu } from './components/Menu';
import { PizzaBuilder } from './components/PizzaBuilder';
import { Cart } from './components/Cart';
import { Checkout, CheckoutData } from './components/Checkout';
import { OrderConfirmation } from './components/OrderConfirmation';

import { mockTenant, pizzaSizes } from './data/repository';
import { Pizza, Drink, CartItem, Order, PizzaSizeId } from '@pizza/types';

export default function App() {
  type ClientView = 'menu' | 'builder' | 'cart' | 'checkout' | 'confirmation';

  const [view, setView] = useState<ClientView>('menu');
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [selectedSize, setSelectedSize] = useState<PizzaSizeId>('oito-pedacos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState('');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

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

  const handleCheckout = (data: CheckoutData) => {
    const newOrderId = `ORD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const address = [data.address, data.addressNumber, data.complement, data.neighborhood]
      .filter(Boolean)
      .join(', ');

    setLastOrder({
      id: newOrderId,
      customerName: data.name,
      phone: data.phone,
      address,
      items: cart,
      total,
      status: 'pending',
      paymentMethod: data.paymentMethod,
      createdAt: new Date(),
    });
    setOrderId(newOrderId);
    setView('confirmation');
  };

  const handleBackToMenu = () => {
    setCart([]);
    setView('menu');
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + mockTenant.deliveryFee;

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
          customerName={lastOrder?.customerName}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}
