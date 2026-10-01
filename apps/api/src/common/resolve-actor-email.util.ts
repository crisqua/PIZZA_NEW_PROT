import { TenantTx } from '../prisma/tenant-context.service';

// Audit log congela o email do ator no momento do evento (AuditLogService) -- mas
// AuthenticatedUser (vindo do JWT) so' tem id/tenantId/role, nunca email (ver
// auth/types/authenticated-user.ts). Todo caller tenant-scoped que precisa logar uma
// acao de um usuario ja autenticado busca o email aqui primeiro, dentro do MESMO tx
// (RLS ja garante que so' enxerga o usuario do proprio tenant).
export async function resolveActorEmail(tx: TenantTx, actorId: string): Promise<string> {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { email: true } });
  return actor?.email ?? 'desconhecido';
}
