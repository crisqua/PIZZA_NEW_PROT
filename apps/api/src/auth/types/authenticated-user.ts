export type UserRole = 'platform_superadmin' | 'tenant_owner' | 'tenant_staff' | 'customer';

export interface AuthenticatedUser {
  id: string;
  tenantId: string | null;
  role: UserRole;
}
