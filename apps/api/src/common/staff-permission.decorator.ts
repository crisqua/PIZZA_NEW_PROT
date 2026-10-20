import { SetMetadata } from '@nestjs/common';
import { StaffPermission } from '../tenants/staff-permissions';

export const STAFF_PERMISSION_KEY = 'requiredStaffPermission';

// Mesmo padrao exato de RequiresModule (SetMetadata + Reflector) -- ver
// StaffPermissionGuard pro resto do raciocinio (duplo portao com @RequiresModule,
// decisao 9 em docs/pizzaria_sprints.md).
export const RequiresStaffPermission = (permission: StaffPermission) => SetMetadata(STAFF_PERMISSION_KEY, permission);
