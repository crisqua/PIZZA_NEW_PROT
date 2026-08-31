export function subscriptionCacheKey(tenantId: string): string {
  return `subscription:tenant:${tenantId}`;
}

// Mais curto que TENANT_BRANDING_CACHE_TTL_SECONDS (300s) -- isso trava acesso pago, nao
// so' cosmetico.
export const SUBSCRIPTION_CACHE_TTL_SECONDS = 60;
