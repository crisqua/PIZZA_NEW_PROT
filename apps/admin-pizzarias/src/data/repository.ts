// Camada de acesso a dados do painel Admin (Sprint 10: unico arquivo que muda pra trocar
// mock por API real, mesmo desenho das Sprints 7/9). Sem tenant/slug proprio (superadmin
// opera sobre a plataforma inteira) -- sem data/tenant.ts, diferente de cliente/pizzaria.
//
// Cada tela busca os proprios dados via useEffect+useState (CRUD de verdade em varios
// recursos), mesma licao arquitetural da Sprint 9: o truque de "binding vivo reatribuido
// uma vez no boot" so' serve pra dado so'-leitura fixado antes do primeiro render. So'
// "plans" continua como estado lifted em App.tsx (populado no boot), ja que TenantForm E
// PlansManagement precisam dele ao mesmo tempo.
import type { Addon, AddonId, Plan, PlanCode, Tenant } from '@pizza/types';
import { apiFetch, setAccessToken, getAccessToken } from './api';

// ---------- Constantes estaticas de UI (copy/regras, nao dado de tenant) ----------

export const PLAN_CODES: PlanCode[] = ['trial', 'pro', 'enterprise'];
export const CORE_MODULES = ['Cardápio', 'Pedidos'];
export const mockAddons: Addon[] = [
  {
    id: 'estoque',
    name: 'Controle de Estoque',
    description: 'Acompanhe a quantidade de cada ingrediente, receba alerta de estoque baixo e evite ficar sem insumo no meio do serviço.',
    price: 39.90,
  },
  {
    id: 'financeiro',
    name: 'Controle Financeiro',
    description: 'Fluxo de caixa da sua pizzaria: receitas dos pedidos, despesas lançadas por você e o saldo do período, tudo num só lugar.',
    price: 49.90,
  },
];

// ---------- Auth ----------

interface AuthResponse {
  accessToken: string;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await apiFetch<AuthResponse>('/auth/login', { method: 'POST', auth: false, body: { email, password } });
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

// ---------- Tenants ----------

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

export interface SubscriptionSummary {
  status: string;
  planCode: string;
  planName: string;
  modules: AddonId[];
}

export interface AdminTenant extends Tenant {
  subscription: SubscriptionSummary | null;
}

function toTenant(t: TenantResponse): Tenant {
  return {
    id: t.id,
    name: t.name,
    subdomain: t.slug,
    logo: t.logo,
    primaryColor: t.primaryColor,
    phone: t.phone,
    address: t.address,
    deliveryFee: t.deliveryFee,
    minOrder: t.minOrder,
    active: t.active,
  };
}

interface PaginatedTenants {
  items: (TenantResponse & { subscription: SubscriptionSummary | null })[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getTenants(): Promise<AdminTenant[]> {
  const res = await apiFetch<PaginatedTenants>('/admin/tenants?pageSize=100');
  return res.items.map((t) => ({ ...toTenant(t), subscription: t.subscription }));
}

export interface TenantBrandingInput {
  name: string;
  slug?: string;
  primaryColor?: string;
  logo?: string;
  phone?: string;
  address?: string;
  deliveryFee?: number;
  minOrder?: number;
}

export async function updateTenant(id: string, input: Partial<TenantBrandingInput>): Promise<Tenant> {
  const res = await apiFetch<TenantResponse>(`/admin/tenants/${id}`, { method: 'PATCH', body: input });
  return toTenant(res);
}

export async function setTenantActive(id: string, active: boolean): Promise<Tenant> {
  const res = await apiFetch<TenantResponse>(`/admin/tenants/${id}/active`, { method: 'PATCH', body: { active } });
  return toTenant(res);
}

export async function getSubscription(tenantId: string): Promise<SubscriptionSummary | null> {
  try {
    const res = await apiFetch<{ status: string; plan: { code: string; name: string; modules: AddonId[] } }>(
      `/admin/tenants/${tenantId}/subscription`,
    );
    return { status: res.status, planCode: res.plan.code, planName: res.plan.name, modules: res.plan.modules };
  } catch {
    return null;
  }
}

export async function updateSubscription(tenantId: string, planId: string): Promise<void> {
  await apiFetch(`/admin/tenants/${tenantId}/subscription`, { method: 'PATCH', body: { planId } });
}

export interface OnboardTenantInput extends TenantBrandingInput {
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  planId: string;
}

export interface OnboardResult {
  tenant: Tenant;
  owner: { id: string; email: string; name: string };
}

export async function onboardTenant(input: OnboardTenantInput): Promise<OnboardResult> {
  const res = await apiFetch<{ tenant: TenantResponse; owner: { id: string; email: string; name: string } }>(
    '/admin/tenants/onboard',
    { method: 'POST', body: input },
  );
  return { tenant: toTenant(res.tenant), owner: res.owner };
}

// ---------- Planos ----------

interface PlanResponse {
  id: string;
  code: PlanCode;
  name: string;
  price: number | null;
  limitLabel: string | null;
  modules: AddonId[];
  active: boolean;
}

function toPlan(p: PlanResponse): Plan {
  return { id: p.id, code: p.code, name: p.name, price: p.price, limitLabel: p.limitLabel ?? '', modules: p.modules, active: p.active };
}

export async function getPlans(): Promise<Plan[]> {
  const res = await apiFetch<PlanResponse[]>('/admin/plans');
  return res.map(toPlan);
}

export interface PlanInput {
  code?: PlanCode;
  name: string;
  price: number | null;
  limitLabel?: string;
  modules: AddonId[];
  active?: boolean;
}

export async function createPlan(input: PlanInput): Promise<Plan> {
  const res = await apiFetch<PlanResponse>('/admin/plans', { method: 'POST', body: input });
  return toPlan(res);
}

export async function updatePlan(id: string, input: Partial<PlanInput>): Promise<Plan> {
  const res = await apiFetch<PlanResponse>(`/admin/plans/${id}`, { method: 'PATCH', body: input });
  return toPlan(res);
}

// ---------- Dashboard ----------

export interface DashboardStats {
  tenantCount: number;
  ordersThisMonth: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/admin/dashboard');
}
