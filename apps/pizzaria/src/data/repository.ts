// Camada de acesso a dados do painel Pizzaria (Sprint 9: unico arquivo que muda pra
// trocar mock por API real, mesmo desenho da Sprint 0/Sprint 7 em apps/cliente).
//
// mockTenant/mockCategories/mockPizzas/unlockedModules sao bindings `let` de nivel de
// modulo, populados UMA VEZ por loadDashboardBoot() antes do primeiro render (App.tsx so'
// renderiza a shell depois que o boot resolve) -- servem so' de VALOR INICIAL pros
// useState lifted de App.tsx (categories/pizzas), igual o `mockCategories` ja fazia antes
// desta sprint. Depois do mount, mudanca de estado flui por CRUD normal do React (setState
// nos handlers), nunca reatribuindo esses bindings de novo -- diferente de recursos
// so'-leitura como o catalogo de apps/cliente, aqui tem CRUD de verdade em varios
// recursos (produtos, estoque, despesas), que cada tela gerencia com seu proprio
// useEffect+useState (padrao React comum), chamando as funcoes exportadas abaixo.
import type { AddonId, Category, Expense, InventoryItem, Pizza, Tenant } from '@pizza/types';
import { apiFetch, setAccessToken, getAccessToken } from './api';
import { getTenantSlug } from './tenant';

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
export let unlockedModules: AddonId[] = [];

// ---------- Auth ----------

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
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
  setAccessToken(null);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export async function tryRestoreSession(): Promise<void> {
  try {
    const res = await apiFetch<AuthResponse>('/auth/refresh', { method: 'POST', auth: false });
    setAccessToken(res.accessToken);
  } catch {
    setAccessToken(null);
  }
}

// ---------- Boot (tenant + assinatura + catalogo) ----------

interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  primaryColor: string;
  logo: string;
  phone: string;
  address: string;
  deliveryFee: number;
  minOrder: number;
}

interface SubscriptionResponse {
  status: string | null;
  planCode: string | null;
  planName: string | null;
  modules: AddonId[];
}

interface CategoryResponse {
  id: string;
  name: string;
}

interface ProductResponse {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  ingredients: string[];
  featured: boolean;
  type: string;
}

function toPizza(p: ProductResponse): Pizza {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.categoryId,
    featured: p.featured,
    image: p.image,
    ingredients: p.ingredients,
  };
}

// Carrega tudo que a shell do painel precisa ANTES do primeiro render (App.tsx so' sai
// do "Carregando..." depois que isso resolve). Cardapio aqui usa as rotas autenticadas
// de staff (/v1/catalog/*), nao o /v1/public/tenants/:slug/catalog do cliente -- o painel
// precisa ver produto indisponivel tambem, o cliente final nao. Filtra so' type='pizza':
// o protototipo desta tela NUNCA teve gestao de bebida nenhuma (sem campo/UI pra isso) --
// gap conhecido, deliberadamente fora do escopo desta sprint (conectar o que ja existe,
// nao inventar tela nova).
export async function loadDashboardBoot(): Promise<void> {
  const [tenant, subscription, categories, products] = await Promise.all([
    apiFetch<TenantResponse>('/tenants/me'),
    apiFetch<SubscriptionResponse>('/tenants/me/subscription'),
    apiFetch<CategoryResponse[]>('/catalog/categories'),
    apiFetch<ProductResponse[]>('/catalog/products'),
  ]);

  mockTenant = {
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.slug,
    logo: tenant.logo,
    primaryColor: tenant.primaryColor,
    phone: tenant.phone,
    address: tenant.address,
    deliveryFee: tenant.deliveryFee,
    minOrder: tenant.minOrder,
    active: tenant.active,
  };
  unlockedModules = subscription.modules;
  mockCategories = categories;
  mockPizzas = products.filter((p) => p.type === 'pizza').map(toPizza);
}

// ---------- Categorias / Produtos (CRUD real) ----------

export async function createCategory(name: string): Promise<Category> {
  return apiFetch<CategoryResponse>('/catalog/categories', { method: 'POST', body: { name } });
}

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  image?: string;
  ingredients?: string[];
}

export async function createProduct(input: ProductInput): Promise<Pizza> {
  const res = await apiFetch<ProductResponse>('/catalog/products', { method: 'POST', body: input });
  return toPizza(res);
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Pizza> {
  const res = await apiFetch<ProductResponse>(`/catalog/products/${id}`, { method: 'PATCH', body: input });
  return toPizza(res);
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/catalog/products/${id}`, { method: 'DELETE' });
}

// ---------- Pedidos ----------

export interface ApiOrderItem {
  id: string;
  productId: string;
  secondProductId: string | null;
  type: string;
  size: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ApiOrder {
  id: string;
  status: 'pending' | 'preparing' | 'delivery' | 'completed' | 'cancelled';
  customerName: string;
  phone: string;
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  paymentMethod: string;
  changeFor: number | null;
  deliveryFee: number;
  total: number;
  items: ApiOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export async function getOrders(): Promise<ApiOrder[]> {
  return apiFetch<ApiOrder[]>('/orders');
}

export async function updateOrderStatus(id: string, status: ApiOrder['status']): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/orders/${id}/status`, { method: 'PATCH', body: { status } });
}

// ---------- Estoque ----------

export async function getInventory(): Promise<InventoryItem[]> {
  return apiFetch<InventoryItem[]>('/inventory');
}

export interface InventoryItemInput {
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
}

export async function createInventoryItem(input: InventoryItemInput): Promise<InventoryItem> {
  return apiFetch<InventoryItem>('/inventory', { method: 'POST', body: input });
}

export async function updateInventoryItem(id: string, input: Partial<InventoryItemInput>): Promise<InventoryItem> {
  return apiFetch<InventoryItem>(`/inventory/${id}`, { method: 'PATCH', body: input });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiFetch(`/inventory/${id}`, { method: 'DELETE' });
}

// ---------- Financeiro ----------

export async function getExpenses(): Promise<Expense[]> {
  return apiFetch<Expense[]>('/financial/expenses');
}

export interface ExpenseInput {
  description: string;
  category: string;
  amount: number;
  date: string;
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  return apiFetch<Expense>('/financial/expenses', { method: 'POST', body: input });
}

export async function deleteExpense(id: string): Promise<void> {
  await apiFetch(`/financial/expenses/${id}`, { method: 'DELETE' });
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export async function getRevenue(from?: string, to?: string): Promise<DailyRevenue[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return apiFetch<DailyRevenue[]>(`/financial/revenue${query ? `?${query}` : ''}`);
}
