import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantTx } from '../prisma/tenant-context.service';

export interface AuditLogEntry {
  tenantId: string | null;
  actorId: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Escritor append-only (Sprint 15, parte 3) -- de proposito SEM update()/delete(): a
// unica forma de uma linha sumir daqui e' o job de expurgo (AuditLogRetentionService)
// movendo pra audit_logs_archive, nunca um caller individual editando/apagando um
// registro. "record" sempre recebe o "tx" (TenantTx) ou o PrismaService global de quem
// chama -- quem decide se a escrita precisa de contexto de tenant (runInTenantContext)
// e' o caller, nao este service (audit_logs tem RLS com o mesmo carve-out de "users":
// tenant_id NULL exige NENHUM contexto de tenant setado na sessao, tenant_id presente
// exige o contexto daquele tenant exato).
@Injectable()
export class AuditLogService {
  async record(tx: TenantTx | PrismaService, entry: AuditLogEntry): Promise<void> {
    await tx.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        actorRole: entry.actorRole,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ?? {},
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  }
}
