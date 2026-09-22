// Processa uma lista em lotes de tamanho fixo, em vez de abrir tudo de uma vez via
// Promise.all(items.map(...)). Existe por causa de um bug real de producao
// (2026-09-22): abrir 1 transacao Prisma por item (tenant) simultaneamente estourava o
// pool de conexoes em instancias com poucos vCPUs (Render) assim que a base cresceu
// alem de ~20-30 tenants, derrubando o endpoint com 500 sem stack trace visivel.
export async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}
