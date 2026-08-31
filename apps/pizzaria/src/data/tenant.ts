// Resolucao de tenant (Sprint 9) -- mesmo padrao exato de apps/cliente/src/data/tenant.ts
// (Sprint 7). O dono/staff loga no proprio painel do tenant; em producao o slug viria do
// subdominio real, no Vite dev local (sem subdominio) o fallback e' VITE_TENANT_SLUG.
export function getTenantSlug(): string {
  const envSlug = import.meta.env.VITE_TENANT_SLUG as string | undefined;
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (!envSlug) {
      throw new Error('VITE_TENANT_SLUG precisa estar definido em .env pra rodar localmente (sem subdominio real).');
    }
    return envSlug;
  }

  const firstLabel = hostname.split('.')[0];
  return envSlug || firstLabel;
}
