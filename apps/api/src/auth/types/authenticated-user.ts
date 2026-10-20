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
  // Sprint "Equipe" (StaffPermissionGuard) -- mesmo raciocinio de performance do
  // "email" acima: viaja no access token pra StaffPermissionGuard nunca precisar de
  // uma ida ao banco por requisicao (o InventoryController/ExpensesController/etc ja
  // sao chamados com alta frequencia). So' importa pra role:'tenant_staff' -- owner/
  // superadmin/customer nunca sao checados contra isto. Staleness aceita: ate 15min
  // (vida do access token) + o refresh() relê active/permissions do banco pra
  // role:'tenant_staff' especificamente, entao nunca fica preso por ate 7 dias (vida
  // do refresh token) com uma permissao ja revogada.
  permissions?: string[];
}
