export function tenantBrandingCacheKey(slug: string): string {
  return `tenant:branding:${slug}`;
}

export const TENANT_BRANDING_CACHE_TTL_SECONDS = 300;
