import { useEffect, useState, CSSProperties } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Menu } from './components/Menu';
import { PizzaBuilder } from './components/PizzaBuilder';
import { Cart } from './components/Cart';
import { Auth } from './components/Auth';
import { Checkout } from './components/Checkout';
import { OrderConfirmation } from './components/OrderConfirmation';

import { mockTenant, isAuthenticated, loadCatalog, tryRestoreSession, logout, verifyEmail, ApiOrder } from './data/repository';
import { Pizza, Drink, CartItem, PizzaSizeId, priceForSize } from '@pizza/types';
import { Button, UpdateBanner } from '@pizza/ui';

export default function App() {
  type ClientView = 'menu' | 'builder' | 'cart' | 'auth' | 'checkout' | 'confirmation';

  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ClientView>('menu');
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [selectedSize, setSelectedSize] = useState<PizzaSizeId>('oito-pedacos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState('');
  const [lastOrder, setLastOrder] = useState<ApiOrder | null>(null);
  // De onde a tela de Auth foi aberta -- decide pra onde volta depois (login vindo do
  // carrinho segue pro checkout; login vindo do icone de cadeado no Menu volta pro Menu).
  const [authOrigin, setAuthOrigin] = useState<'cart' | 'menu'>('cart');
  // So' pra forcar um re-render depois de logout()/login bem sucedido -- isAuthenticated()
  // le um token em memoria (data/api.ts), nao e' estado reativo por si so'.
  const [authVersion, setAuthVersion] = useState(0);
  // Mesma tecnica, motivo diferente: mockPizzas/mockCategories/etc (repository.ts) sao
  // lidos como bindings de modulo sincronos por Menu.tsx, nunca via props/estado -- uma
  // aba que fica aberta enquanto o dono edita um produto em outra sessao nunca saberia
  // disso sozinha (loadCatalog so' roda uma vez, no boot). Bug real reportado pelo
  // usuario: preco alterado no painel nao refletia no Menu ja aberto do cliente, so'
  // corrigia com F5. Incrementar isso remonta <Menu/> (key abaixo) depois de recarregar
  // o catalogo, forcando o componente a ler os bindings ja atualizados.
  const [catalogVersion, setCatalogVersion] = useState(0);
  // Confirmacao de e-mail (Sprint 14) -- unico ponto de entrada por URL deste app (SPA
  // sem router). null = nao veio de um link de confirmacao (boot normal).
  const [emailVerifyResult, setEmailVerifyResult] = useState<'ok' | 'error' | null>(null);

  // Boot: tenta restaurar a sessao via cookie de refresh (Sprint 2) e carrega o cardapio
  // real ANTES de renderizar qualquer coisa que dependa deles -- Menu.tsx/PizzaBuilder.tsx
  // leem mockTenant/mockPizzas/mockDrinks como bindings de modulo sincronos (repository.ts),
  // entao precisam ja estar populados no momento em que esses componentes montam.
  useEffect(() => {
    (async () => {
      const token = new URLSearchParams(window.location.search).get('token');
      if (token) {
        try {
          await verifyEmail(token);
          setEmailVerifyResult('ok');
        } catch {
          setEmailVerifyResult('error');
        }
        // Limpa o "?token=..." da URL -- um F5 depois nao deve tentar verificar o mesmo
        // token de novo (ele e' de uso unico, a segunda tentativa so' daria erro a toa).
        window.history.replaceState({}, '', window.location.pathname);
      }
      await tryRestoreSession();
      await loadCatalog();
      setReady(true);
    })();
  }, []);

  // Recarrega o catalogo quando a aba volta a ficar em foco -- so' depois do boot
  // (ready), pra nao competir com o loadCatalog() inicial acima. Sem intervalo fixo de
  // proposito (diferente do UpdateBanner, que checa versao de app): um catalogo inteiro
  // e' mais pesado que um arquivo de versao, e refazer isso a cada poucos minutos
  // enquanto o cliente esta navegando ativamente resetaria a selecao de tamanho/
  // categoria aberta a toa. "Aba voltou do segundo plano" e' o sinal certo -- mesmo
  // momento em que um F5 manual ja teria corrigido o problema mesmo.
  useEffect(() => {
    if (!ready) return;
    const onVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        await loadCatalog();
        setCatalogVersion((v) => v + 1);
      } catch {
        // Falha de rede pontual -- mantem o catalogo antigo em memoria em vez de
        // quebrar a tela (mesmo raciocinio de fail-open ja usado em CepLookupService).
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [ready]);

  const handleStartHalfHalf = (pizza: Pizza, size: PizzaSizeId) => {
    setSelectedPizza(pizza);
    setSelectedSize(size);
    setView('builder');
  };

  // Mesma pizza = mesmo tamanho + mesmo conjunto de sabores (ordem nao importa: meio a
  // meio A+B e' a mesma pizza que B+A). Clicar em "+" numa pizza ja' no carrinho soma
  // quantidade em vez de criar uma segunda linha (pedido do usuario) -- mesmo padrao que
  // handleAddDrink ja' usava pra bebidas.
  const sameFlavors = (a: Pizza[], b: Pizza[]): boolean => {
    if (a.length !== b.length) return false;
    const idsA = [...a.map(f => f.id)].sort();
    const idsB = [...b.map(f => f.id)].sort();
    return idsA.every((id, i) => id === idsB[i]);
  };

  const handleAddSingleFlavor = (pizza: Pizza, size: PizzaSizeId) => {
    const price = priceForSize(pizza, size);
    // Defesa em profundidade: o botao desse tamanho ja vem desabilitado no Menu.tsx
    // quando o dono nao cadastrou preco pra ele, mas nunca confiar so' na UI -- um
    // tamanho sem preco nunca pode virar item no carrinho (o backend rejeitaria no
    // checkout mesmo assim, so' que tarde e com um erro confuso pro cliente).
    if (price == null) return;
    const existingItem = cart.find(
      item => item.type === 'pizza' && item.pizza && item.pizza.size === size && sameFlavors(item.pizza.flavors, [pizza])
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
        type: 'pizza',
        pizza: { size, flavors: [pizza] },
        quantity: 1,
        price,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleAddPizzaToCart = (pizza: { size: PizzaSizeId; flavors: Pizza[]; price: number }) => {
    const existingItem = cart.find(
      item => item.type === 'pizza' && item.pizza && item.pizza.size === pizza.size && sameFlavors(item.pizza.flavors, pizza.flavors)
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
        type: 'pizza',
        pizza,
        quantity: 1,
        price: pizza.price,
      };
      setCart([...cart, newItem]);
    }
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

  const handleAddSobremesa = (sobremesa: Drink) => {
    const existingItem = cart.find(
      item => item.type === 'sobremesa' && item.sobremesa?.id === sobremesa.id
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
        type: 'sobremesa',
        sobremesa,
        quantity: 1,
        price: sobremesa.price,
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
    setAuthOrigin('cart');
    setView(isAuthenticated() ? 'checkout' : 'auth');
  };

  // Icone de cadeado/pessoa no Menu (pedido do usuario): deslogado abre a tela de Auth
  // (volta pro Menu ao terminar); logado desloga na hora (sem tela de confirmacao --
  // mesmo padrao direto do botao "Sair" dos outros 2 apps do monorepo).
  const handleAccountClick = () => {
    if (isAuthenticated()) {
      logout().then(() => setAuthVersion((v) => v + 1));
    } else {
      setAuthOrigin('menu');
      setView('auth');
    }
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

  if (emailVerifyResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          {emailVerifyResult === 'ok' ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h1 className="font-serif text-xl text-foreground">E-mail confirmado!</h1>
              <p className="text-sm text-muted-foreground">Seu cadastro foi verificado com sucesso.</p>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h1 className="font-serif text-xl text-foreground">Link inválido ou expirado</h1>
              <p className="text-sm text-muted-foreground">
                Esse link de confirmação já foi usado ou não é mais válido.
              </p>
            </>
          )}
          <Button onClick={() => setEmailVerifyResult(null)}>Continuar para o cardápio</Button>
        </div>
      </div>
    );
  }

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
      style={{ '--primary': mockTenant.primaryColor, '--accent': mockTenant.primaryColor } as CSSProperties}
    >
      <UpdateBanner />
      {view === 'menu' && (
        <Menu
          key={`${authVersion}-${catalogVersion}`}
          onAddSingleFlavor={handleAddSingleFlavor}
          onStartHalfHalf={handleStartHalfHalf}
          onAddDrink={handleAddDrink}
          onAddSobremesa={handleAddSobremesa}
          cartItemsCount={cart.length}
          onViewCart={() => setView('cart')}
          isLoggedIn={isAuthenticated()}
          onAccountClick={handleAccountClick}
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
      {view === 'auth' && (
        <Auth
          onBack={() => setView(authOrigin)}
          onAuthenticated={() => setView(authOrigin === 'cart' ? 'checkout' : 'menu')}
        />
      )}
      {view === 'checkout' && (
        <Checkout items={cart} total={total} onBack={() => setView('cart')} onSuccess={handleOrderSuccess} />
      )}
      {view === 'confirmation' && (
        <OrderConfirmation
          orderId={orderId}
          orderCode={lastOrder?.orderCode}
          total={lastOrder?.total ?? total}
          estimatedTime="40-60 min"
          customerName={lastOrder?.customerName}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}
