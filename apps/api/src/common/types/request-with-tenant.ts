import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { TenantTx } from '../../prisma/tenant-context.service';

// Populado incrementalmente ao longo do pipeline de uma requisicao:
// JwtAuthGuard seta `user`/`tenantId` -> TenantContextInterceptor (Sprint 1, ja existente)
// le `tenantId` e seta `tenantTx`.
export interface RequestWithTenant extends Request {
  user?: AuthenticatedUser;
  tenantId?: string;
  tenantTx?: TenantTx;
}
