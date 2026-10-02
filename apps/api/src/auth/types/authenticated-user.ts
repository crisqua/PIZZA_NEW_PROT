export type UserRole = 'platform_superadmin' | 'tenant_owner' | 'tenant_staff' | 'customer';

export interface AuthenticatedUser {
  id: string;
  tenantId: string | null;
  role: UserRole;
  // Opcional de proposito (Sprint 15, perf): populado a partir do JWT quando presente
  // (tokens emitidos apos esta mudanca), evita uma ida extra ao banco so' pra gravar
  // audit log (ver resolve-actor-email.util.ts). Tokens emitidos ANTES desta mudanca
  // nao tem o campo -- expiram em ate 15min (JWT_EXPIRES_IN), entao o periodo de
  // transicao e' curto; callers que precisam do email tratam undefined com fallback.
  email?: string;
}
