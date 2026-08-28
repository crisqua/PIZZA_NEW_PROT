import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

import { Menu } from '../components/client/Menu';
import { PizzaBuilder } from '../components/client/PizzaBuilder';
import { Cart } from '../components/client/Cart';
import { Checkout, CheckoutData } from '../components/client/Checkout';
import { OrderConfirmation } from '../components/client/OrderConfirmation';

import { Pizza, Drink, CartItem, Order, PizzaSizeId, mockTenant } from '../data/mockData';

export default function ClientApp() {
  type ClientView = 'menu' | 'builder' | 'cart' | 'checkout' | 'confirmation';

  const [view, setView] = useState<ClientView>('menu');
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState('');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const handleSelectPizza = (pizza: Pizza) => {
    setSelectedPizza(pizza);
    setView('builder');
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
          customerName={lastOrder?.customerName}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}
