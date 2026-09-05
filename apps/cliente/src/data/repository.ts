// Camada de acesso a dados do app Cliente (Sprint 7: unico arquivo que muda pra trocar
// mock por API real, por design desde a Sprint 0 -- nenhum componente de UI importa a
// API/fetch diretamente).
//
// mockTenant/mockCategories/mockPizzas/mockDrinks/mockCustomer continuam com esses nomes
// e continuam sendo `let` de nivel de modulo (nao funcoes) de proposito: Menu.tsx,
// PizzaBuilder.tsx e Cart.tsx importam esses bindings diretamente e os leem de forma
// sincrona -- reatribuir o binding exportado (ligacao viva de ES module) depois de
// `loadCatalog()`/login resolver e' o jeito de entregar dado real pra eles SEM precisar
// reescrever nenhum desses componentes. App.tsx so' pode renderizar <Menu/> depois que
// `loadCatalog()` resolver (ver App.tsx).
import type { Category, CartItem, Customer, Drink, Pizza, PizzaSizeId, Tenant } from '@pizza/types';
import { apiFetch, setAccessToken, getAccessToken } from './api';
import { getTenantSlug } from './tenant';

export const pizzaSizes: { id: PizzaSizeId; name: string; slices: number }[] = [
  { id: 'brotinho', name: 'Brotinho', slices: 4 },
  { id: 'oito-pedacos', name: '8 pedaços', slices: 8 },
  { id: 'doze-pedacos', name: '12 pedaços', slices: 12 },
];

export let mockTenant: Tenant = {
  id: '',
  name: '',
  subdomain: '',
  logo: '🍕',
  primaryColor: '#C9A84C',
  phone: '',
  address: '',
  deliveryFee: 0,
  minOrder: 0,
  active: true,
};
export let mockCategories: Category[] = [];
export let mockPizzas: Pizza[] = [];
export let mockDrinks: Drink[] = [];
// null = cliente novo, sem sessao -- Checkout.tsx nasce em branco (mesmo significado que
// tinha no mock original).
export let mockCustomer: Customer | null = null;

interface TenantBrandingResponse {
  name: string;
  slug: string;
  primaryColor: string;
  logo: string;
  deliveryFee: number;
  minOrder: number;
}

interface ProductResponse {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number | null;
  priceBrotinho: number | null;
  priceOitoPedacos: number | null;
  priceDozePedacos: number | null;
  image: string;
  ingredients: string[];
  featured: boolean;
  type: string;
}

interface CatalogResponse {
  categories: Category[];
  products: ProductResponse[];
}

export async function loadCatalog(): Promise<void> {
  const slug = getTenantSlug();
  const [branding, catalog] = await Promise.all([
    apiFetch<TenantBrandingResponse>(`/public/tenants/${slug}`, { auth: false }),
    apiFetch<CatalogResponse>(`/public/tenants/${slug}/catalog`, { auth: false }),
  ]);

  mockTenant = {
    id: slug,
    name: branding.name,
    subdomain: slug,
    logo: branding.logo,
    primaryColor: branding.primaryColor,
    phone: '',
    address: '',
    deliveryFee: branding.deliveryFee,
    minOrder: branding.minOrder,
    active: true,
  };
  mockCategories = catalog.categories;
  mockPizzas = catalog.products.filter((p) => p.type === 'pizza').map(toPizza);
  // Product nao tem um campo de "tamanho em texto" (350ml/2L) -- nao existia antes da
  // Sprint 7 e nao foi pedido pelo escopo dela; fica vazio ate' o catalogo ganhar esse
  // campo (gap conhecido, cosmetico, nao afeta preco/pedido).
  mockDrinks = catalog.products.filter((p) => p.type === 'drink').map(toDrink);
}

function toPizza(p: ProductResponse): Pizza {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    priceBrotinho: p.priceBrotinho ?? 0,
    priceOitoPedacos: p.priceOitoPedacos ?? 0,
    priceDozePedacos: p.priceDozePedacos ?? 0,
    category: p.categoryId,
    featured: p.featured,
    image: p.image,
    ingredients: p.ingredients,
  };
}

function toDrink(p: ProductResponse): Drink {
  return { id: p.id, name: p.name, price: p.price ?? 0, size: '' };
}

interface MeResponse {
  id: string;
  name: string;
  phone: string;
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
}

async function loadMe(): Promise<void> {
  const me = await apiFetch<MeResponse>('/users/me');
  mockCustomer = {
    id: me.id,
    name: me.name,
    phone: me.phone,
    address: me.address,
    addressNumber: me.addressNumber,
    complement: me.complement,
    neighborhood: me.neighborhood,
  };
}

interface AuthResponse {
  accessToken: string;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password, tenantSlug: getTenantSlug() },
  });
  setAccessToken(res.accessToken);
  await loadMe();
}

export async function register(name: string, email: string, password: string): Promise<void> {
  const res = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: { tenantSlug: getTenantSlug(), name, email, password },
  });
  setAccessToken(res.accessToken);
  await loadMe();
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
  setAccessToken(null);
  mockCustomer = null;
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// Chamado uma vez no boot do App (Sprint 7): tenta reaproveitar o cookie httpOnly de
// refresh (Sprint 2) pra restaurar a sessao sem pedir login de novo a cada F5. Falha
// silenciosa (cliente novo/sessao expirada) -- nao e' erro, e' o caminho normal de quem
// nunca logou.
export async function tryRestoreSession(): Promise<void> {
  try {
    const res = await apiFetch<AuthResponse>('/auth/refresh', { method: 'POST', auth: false });
    setAccessToken(res.accessToken);
    await loadMe();
  } catch {
    setAccessToken(null);
  }
}

export interface CreateOrderItemPayload {
  productId: string;
  secondProductId?: string;
  size?: PizzaSizeId;
  quantity?: number;
}

export interface CreateOrderPayload {
  items: CreateOrderItemPayload[];
  phone: string;
  address: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string;
  paymentMethod: string;
  changeFor?: number;
}

export interface ApiOrder {
  id: string;
  status: 'pending' | 'preparing' | 'delivery' | 'completed' | 'cancelled';
  customerName: string;
  total: number;
  createdAt: string;
}

// Mapeia o carrinho (CartItem[], ja' com preco calculado no client so' pra exibicao) pro
// payload que a API espera -- o preco de verdade e' sempre recalculado no servidor
// (OrdersService), nunca enviado daqui.
export function buildOrderItems(items: CartItem[]): CreateOrderItemPayload[] {
  return items.map((item) => {
    if (item.type === 'pizza' && item.pizza) {
      const [first, second] = item.pizza.flavors;
      return {
        productId: first.id,
        secondProductId: second?.id,
        size: item.pizza.size,
        quantity: item.quantity,
      };
    }
    return { productId: item.drink!.id, quantity: item.quantity };
  });
}

export async function createOrder(payload: CreateOrderPayload, idempotencyKey: string): Promise<ApiOrder> {
  return apiFetch<ApiOrder>('/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: payload,
  });
}

export async function getOrder(id: string): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/orders/${id}`);
}
