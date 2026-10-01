import { Module } from '@nestjs/common';
import { AuditLogRetentionController } from './audit-log-retention.controller';
import { AuditLogRetentionService } from './audit-log-retention.service';
import { AuditLogService } from './audit-log.service';

// PrismaService/TenantContextService vem do PrismaModule (@Global, ver prisma.module.ts)
// -- nao precisa importar nada aqui pra eles ficarem disponiveis.
@Module({
  controllers: [AuditLogRetentionController],
  providers: [AuditLogService, AuditLogRetentionService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
