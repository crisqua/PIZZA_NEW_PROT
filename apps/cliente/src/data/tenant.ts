// Resolucao de tenant (Sprint 7, MVP.md item 5: "cliente navega cardapio pelo
// subdominio do tenant"). Ainda nao existe hosting real com subdominio por tenant --
// em producao o primeiro label do hostname seria o slug; em dev local (Vite,
// localhost:5173) nao ha subdominio nenhum pra ler, entao VITE_TENANT_SLUG e' o
// fallback (aponte pro slug de um tenant ja seedado no homolog).
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
