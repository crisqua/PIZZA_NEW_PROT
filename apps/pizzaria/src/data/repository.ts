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
import type { AddonId, Category, Expense, InventoryItem, Tenant } from '@pizza/types';
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
  cnpj: null,
  active: true,
};
export let mockCategories: Category[] = [];
export let mockPizzas: AdminProduct[] = [];
export let unlockedModules: AddonId[] = [];

// Painel gerencia os 3 tipos de produto do cardapio (pizza/bebida/sobremesa) na mesma
// tela (ProductForm.tsx com abas) -- Pizza usa os 3 precos por tamanho, bebida e
// sobremesa usam preco unico + "tamanho" em texto livre (ex. "2L"/"Fatia").
export type ProductType = 'pizza' | 'drink' | 'sobremesa';

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  priceBrotinho: number | null;
  priceOitoPedacos: number | null;
  priceDozePedacos: number | null;
  price: number | null;
  size: string;
  category: string;
  featured: boolean;
  image: string;
  ingredients: string[];
}

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
  cnpj: string | null;
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
  type: ProductType;
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
  size: string;
  image: string;
  ingredients: string[];
  featured: boolean;
  type: string;
}

function toAdminProduct(p: ProductResponse): AdminProduct {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    type: (p.type as ProductType) ?? 'pizza',
    priceBrotinho: p.priceBrotinho,
    priceOitoPedacos: p.priceOitoPedacos,
    priceDozePedacos: p.priceDozePedacos,
    price: p.price,
    size: p.size,
    category: p.categoryId,
    featured: p.featured,
    image: p.image,
    ingredients: p.ingredients,
  };
}

// Carrega tudo que a shell do painel precisa ANTES do primeiro render (App.tsx so' sai
// do "Carregando..." depois que isso resolve). Cardapio aqui usa as rotas autenticadas
// de staff (/v1/catalog/*), nao o /v1/public/tenants/:slug/catalog do cliente -- o painel
// precisa ver produto indisponivel tambem, o cliente final nao. Traz os 3 tipos de
// produto (pizza/bebida/sobremesa) -- ProductForm.tsx com abas ja sabe criar/editar
// qualquer um deles.
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
    cnpj: tenant.cnpj,
    active: tenant.active,
  };
  unlockedModules = subscription.modules;
  mockCategories = categories;
  mockPizzas = products.map(toAdminProduct);
}

// ---------- Configurações da loja (Settings.tsx) ----------

// So' os campos que "tenants" de fato tem no schema (name/phone/address/primaryColor/
// logo/deliveryFee/minOrder) -- Settings.tsx tinha varios outros inputs (descricao,
// e-mail, cidade/estado, horario de funcionamento, tempo de entrega estimado) que nunca
// tiveram coluna nenhuma no banco, sao mock puro ainda (nao mexidos aqui).
export interface TenantSettingsInput {
  name?: string;
  phone?: string;
  address?: string;
  primaryColor?: string;
  logo?: string;
  deliveryFee?: number;
  minOrder?: number;
  cnpj?: string;
}

export async function updateTenantSettings(input: TenantSettingsInput): Promise<void> {
  const tenant = await apiFetch<TenantResponse>('/tenants/me', { method: 'PATCH', body: input });
  mockTenant = {
    ...mockTenant,
    name: tenant.name,
    logo: tenant.logo,
    primaryColor: tenant.primaryColor,
    phone: tenant.phone,
    address: tenant.address,
    deliveryFee: tenant.deliveryFee,
    minOrder: tenant.minOrder,
    cnpj: tenant.cnpj,
  };
}

// ---------- Categorias / Produtos (CRUD real) ----------

export async function createCategory(name: string, type: ProductType): Promise<Category> {
  return apiFetch<CategoryResponse>('/catalog/categories', { method: 'POST', body: { name, type } });
}

export interface ProductInput {
  name: string;
  description?: string;
  type: ProductType;
  // Pizza: pelo menos 1 dos 3 precisa vir preenchido (regra checada no backend,
  // ProductsService.assertPizzaHasAtLeastOnePrice) -- null e' o dono deixando de
  // vender aquele tamanho de proposito, nao um dado faltando. Bebida/sobremesa:
  // price obrigatorio, size opcional.
  priceBrotinho?: number | null;
  priceOitoPedacos?: number | null;
  priceDozePedacos?: number | null;
  price?: number;
  size?: string;
  categoryId: string;
  image?: string;
  ingredients?: string[];
}

export async function createProduct(input: ProductInput): Promise<AdminProduct> {
  const res = await apiFetch<ProductResponse>('/catalog/products', { method: 'POST', body: input });
  return toAdminProduct(res);
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<AdminProduct> {
  const res = await apiFetch<ProductResponse>(`/catalog/products/${id}`, { method: 'PATCH', body: input });
  return toAdminProduct(res);
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/catalog/products/${id}`, { method: 'DELETE' });
}

interface UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

// Sprint 16: sobe a imagem DIRETO pro Supabase Storage usando uma URL assinada de uso
// unico (nunca passa pelo nosso backend, so' pede a URL pra ele) -- pega a URL, faz o
// PUT do arquivo, devolve a URL publica final pra salvar no campo "image" do produto.
export async function uploadProductImage(file: File): Promise<string> {
  const { uploadUrl, publicUrl } = await apiFetch<UploadUrlResponse>('/catalog/products/upload-url', {
    method: 'POST',
    body: { fileName: file.name, contentType: file.type },
  });

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error('Nao foi possivel enviar a imagem. Tente novamente.');
  }

  return publicUrl;
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
  orderCode: string;
  status: 'pending' | 'preparing' | 'delivery' | 'completed' | 'cancelled';
  customerName: string;
  phone: string;
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  cep: string;
  city: string;
  state: string;
  paymentMethod: string;
  changeFor: number | null;
  deliveryFee: number;
  total: number;
  items: ApiOrderItem[];
  createdAt: string;
  updatedAt: string;
}

// Filtro no BACKEND agora -- sem isso, GET /orders trazia o historico inteiro do tenant
// a cada chamada. "date" (YYYY-MM-DD, dia-calendario em Sao Paulo) usado por
// OrdersPanel.tsx (polling a cada 10s); "from"/"to" (instante ISO exato) usado por
// Dashboard.tsx pro "dia de operacao" que corta as 5h da manha em vez de meia-noite.
// Sem nenhum dos dois, mantem o comportamento legado (sem filtro) -- ainda usado por
// Financial.tsx ate ser migrado.
export async function getOrders(filter: { date?: string; from?: string; to?: string } = {}): Promise<ApiOrder[]> {
  const params = new URLSearchParams();
  if (filter.date) params.set('date', filter.date);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  const query = params.toString();
  return apiFetch<ApiOrder[]>(`/orders${query ? `?${query}` : ''}`);
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

// "Produtos Mais Vendidos (Mensal)" -- ultimos 30 dias corridos, somado no BACKEND (ver
// OrdersService.topProducts). Antes disso, Dashboard.tsx baixava o historico de pedidos
// inteiro so' pra esse calculo, sem limite de tempo.
export async function getTopProducts(): Promise<TopProduct[]> {
  return apiFetch<TopProduct[]>('/orders/top-products');
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

export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
  return apiFetch<Expense>(`/financial/expenses/${id}`, { method: 'PATCH', body: input });
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
