import { RequestWithTenant } from './types/request-with-tenant';

// Sprint 15: tracker do throttler nomeado "tenant" em POST /orders -- rastreia pelo
// tenantId autenticado, nao pelo IP (padrao do @nestjs/throttler). Protege contra um bug
// de retry-loop no frontend de UMA pizzaria especifica sobrecarregar o rate limit
// compartilhado com todas as outras -- so' o limite por IP nao isola isso (varios
// clientes da mesma pizzaria vem de IPs diferentes, e um proxy/NAT pode colocar clientes
// de pizzarias diferentes atras do mesmo IP).
export async function tenantThrottlerTracker(req: RequestWithTenant): Promise<string> {
  // Sem usuario autenticado (nao deveria acontecer -- JwtAuthGuard roda antes) cai pro
  // IP, nunca quebra a requisicao por causa do rate limit.
  return req.user?.tenantId ?? req.ip ?? 'unknown';
}
